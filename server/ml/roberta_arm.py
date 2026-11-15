"""
Formal Model Arm 2: Fine-Tuned RoBERTa-base Classifier.

Gold and exploratory artifacts are stored separately. Gold classification only
loads gold-mode weights. Training selects the checkpoint with the lowest
validation loss and evaluates that checkpoint once on the held-out test split.
"""

import copy
import json
import os
import random
import time
from typing import Any, Dict, List, Optional

import numpy as np
import torch
from scipy.special import softmax

from .split_manager import (
    TAXONOMY_CATEGORIES,
    partition_records,
    get_dataset_statistics,
    load_adjudicated_data,
)
from .evaluation import (
    calculate_metrics,
    bootstrap_macro_f1_ci,
    compute_confusion_matrix_data,
)

ARTIFACT_ROOT = os.path.join(os.path.dirname(__file__), "artifacts")
# Keep the original gold artifact location for backwards compatibility.
ROBERTA_ARTIFACT_DIR = os.path.join(ARTIFACT_ROOT, "roberta")
METADATA_PATH = os.path.join(ROBERTA_ARTIFACT_DIR, "roberta_metadata.json")
EVAL_PATH = os.path.join(ROBERTA_ARTIFACT_DIR, "roberta_evaluation.json")
RANDOM_SEED = 42
MAX_LENGTH = 128
MAX_GRAD_NORM = 1.0


def _paths_for_mode(mode: str) -> Dict[str, str]:
    if mode not in ("gold", "exploratory"):
        raise ValueError("mode must be 'gold' or 'exploratory'")
    artifact_dir = (
        ROBERTA_ARTIFACT_DIR
        if mode == "gold"
        else os.path.join(ARTIFACT_ROOT, "roberta_exploratory")
    )
    return {
        "artifact_dir": artifact_dir,
        "metadata": os.path.join(artifact_dir, "roberta_metadata.json"),
        "evaluation": os.path.join(artifact_dir, "roberta_evaluation.json"),
    }


def _artifact_exists(artifact_dir: str) -> bool:
    config_path = os.path.join(artifact_dir, "config.json")
    weight_paths = (
        os.path.join(artifact_dir, "model.safetensors"),
        os.path.join(artifact_dir, "pytorch_model.bin"),
    )
    return os.path.isfile(config_path) and any(os.path.isfile(p) for p in weight_paths)


def _read_json(path: str) -> Optional[Dict[str, Any]]:
    try:
        with open(path, "r", encoding="utf-8") as handle:
            value = json.load(handle)
        return value if isinstance(value, dict) else None
    except (OSError, json.JSONDecodeError):
        return None


def detect_hardware() -> Dict[str, Any]:
    """Detect CUDA capability and choose a conservative batch size."""
    cuda_available = torch.cuda.is_available()
    device_name = "CPU"
    vram_gb = 0.0

    if cuda_available:
        try:
            device_name = torch.cuda.get_device_name(0)
            vram_bytes = torch.cuda.get_device_properties(0).total_memory
            vram_gb = round(vram_bytes / (1024 ** 3), 2)
        except Exception:
            device_name = "CUDA (Generic)"

    suggested_batch_size = (
        4 if cuda_available and vram_gb <= 4.5
        else 8 if cuda_available
        else 4
    )
    return {
        "cuda_available": cuda_available,
        "device": "cuda" if cuda_available else "cpu",
        "device_name": device_name,
        "vram_gb": vram_gb,
        "recommended_batch_size": suggested_batch_size,
    }


class RobertaClassifierArm:
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.metadata = None
        self.is_loaded = False
        self.hardware = detect_hardware()
        self._load_artifact()

    def _load_artifact(self):
        """Load only the formal gold artifact into the inference instance."""
        paths = _paths_for_mode("gold")
        if not _artifact_exists(paths["artifact_dir"]):
            return

        metadata = _read_json(paths["metadata"])
        if not metadata or metadata.get("mode") != "gold":
            return

        try:
            from transformers import AutoTokenizer, AutoModelForSequenceClassification

            self.tokenizer = AutoTokenizer.from_pretrained(paths["artifact_dir"])
            self.model = AutoModelForSequenceClassification.from_pretrained(
                paths["artifact_dir"]
            )
            self.model.to(self.hardware["device"])
            self.model.eval()
            self.metadata = metadata
            self.is_loaded = True
        except Exception as exc:
            print(f"[RoBERTa Arm] Warning: gold artifact failed to load: {exc}")
            self.model = None
            self.tokenizer = None
            self.metadata = None
            self.is_loaded = False

    def get_status(
        self,
        records: Optional[List[Dict[str, Any]]] = None,
        mode: str = "gold",
    ) -> Dict[str, Any]:
        """Report status and evaluation for the requested artifact mode."""
        if mode not in ("gold", "exploratory"):
            raise ValueError("mode must be 'gold' or 'exploratory'")

        paths = _paths_for_mode(mode)
        stats = get_dataset_statistics(
            records if records is not None else load_adjudicated_data(),
            mode=mode,
        )
        metadata = _read_json(paths["metadata"])
        evaluation = _read_json(paths["evaluation"])

        metadata_matches_mode = bool(metadata and metadata.get("mode") == mode)
        trained = metadata_matches_mode and _artifact_exists(paths["artifact_dir"])
        if evaluation and evaluation.get("mode") != mode:
            evaluation = None

        return {
            "model_name": "RoBERTa-base (4-way Sequence Classification)",
            "status": "trained" if trained else "awaiting_data",
            "is_trained": trained,
            "artifact_path": paths["artifact_dir"] if trained else None,
            "training_metadata": metadata if trained else None,
            "hardware": self.hardware,
            "dataset_status": stats,
            "evaluation": evaluation if trained else None,
        }

    @staticmethod
    def _label_for_record(record: Dict[str, Any], mode: str) -> Optional[str]:
        annotations = record.get("humanAnnotations") or {}
        if mode == "gold":
            label = annotations.get("adjudicated") or record.get("adjudicated")
        else:
            label = (
                record.get("exploratoryLabel")
                or record.get("predictedCategory")
                or annotations.get("adjudicated")
                or record.get("adjudicated")
            )
        return label if label in TAXONOMY_CATEGORIES else None

    @staticmethod
    def _evaluate_loss(model, data_loader, device) -> float:
        """Return mean example-weighted loss without updating model weights."""
        model.eval()
        total_loss = 0.0
        total_examples = 0
        with torch.no_grad():
            for batch in data_loader:
                input_ids = batch["input_ids"].to(device)
                attention_mask = batch["attention_mask"].to(device)
                labels = batch["labels"].to(device)
                outputs = model(
                    input_ids=input_ids,
                    attention_mask=attention_mask,
                    labels=labels,
                )
                count = int(labels.shape[0])
                total_loss += float(outputs.loss.item()) * count
                total_examples += count
        if total_examples == 0:
            raise ValueError("Validation partition is empty; checkpoint selection is impossible.")
        return total_loss / total_examples

    def train(
        self,
        records: List[Dict[str, Any]],
        mode: str = "gold",
        epochs: int = 3,
        batch_size: Optional[int] = None,
        lr: float = 2e-5,
        warmup_ratio: float = 0.1,
        seed: int = RANDOM_SEED,
    ) -> Dict[str, Any]:
        """Fine-tune RoBERTa and select the checkpoint with lowest validation loss."""
        if mode not in ("gold", "exploratory"):
            return {"success": False, "status": "invalid_mode", "message": "mode must be gold or exploratory"}
        if not isinstance(epochs, int) or epochs < 1:
            return {"success": False, "status": "invalid_configuration", "message": "epochs must be a positive integer"}
        if lr <= 0 or not 0 <= warmup_ratio < 1:
            return {"success": False, "status": "invalid_configuration", "message": "lr must be positive and warmup_ratio must be in [0, 1)"}

        stats = get_dataset_statistics(records, mode=mode)
        eligibility = stats["training_eligibility"]
        if not eligibility["is_eligible"]:
            missing = [
                f"{category}: have {details['train_count']}, need {details['required']} "
                f"(missing {details['missing']})"
                for category, details in eligibility["per_class_status"].items()
                if details["missing"] > 0
            ]
            return {
                "success": False,
                "status": "insufficient_data",
                "message": (
                    f"Supervised RoBERTa-base fine-tuning requires at least "
                    f"{eligibility['min_records_per_class']} training examples per category. "
                    f"Missing: {'; '.join(missing)}."
                ),
                "details": eligibility,
            }

        usable_records = []
        for record in records:
            label = self._label_for_record(record, mode)
            text = str(record.get("text") or "").strip()
            if label and text:
                usable_records.append({
                    "id": record.get("id"),
                    "text": text,
                    "review_id": (
                        record.get("reviewId")
                        or record.get("review_id")
                        or record.get("id")
                    ),
                    "label": label,
                })

        splits = partition_records(usable_records)
        train_data = splits["train"]
        val_data = splits["val"]
        test_data = splits["test"]
        if not train_data or not val_data or not test_data:
            return {
                "success": False,
                "status": "invalid_split",
                "message": (
                    "Training requires non-empty train, validation, and test partitions. "
                    f"Observed counts: train={len(train_data)}, val={len(val_data)}, "
                    f"test={len(test_data)}. Add more independently labelled reviews."
                ),
                "split_counts": {name: len(data) for name, data in splits.items()},
            }

        try:
            from transformers import (
                AutoTokenizer,
                AutoModelForSequenceClassification,
                get_linear_schedule_with_warmup,
            )
            from torch.utils.data import DataLoader, Dataset
        except ImportError as exc:
            return {"success": False, "status": "missing_dependency", "message": str(exc)}

        random.seed(seed)
        np.random.seed(seed)
        torch.manual_seed(seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(seed)

        label2id = {category: index for index, category in enumerate(TAXONOMY_CATEGORIES)}
        id2label = {index: category for category, index in label2id.items()}

        try:
            tokenizer = AutoTokenizer.from_pretrained("roberta-base")
            model = AutoModelForSequenceClassification.from_pretrained(
                "roberta-base",
                num_labels=len(TAXONOMY_CATEGORIES),
                id2label=id2label,
                label2id=label2id,
            )
        except Exception as exc:
            return {
                "success": False,
                "status": "weights_unavailable",
                "message": (
                    f"Could not load pretrained roberta-base weights: {exc}. "
                    "A cached checkpoint or network access is required for the initial download."
                ),
            }

        class RequirementDataset(Dataset):
            def __init__(self, data, active_tokenizer):
                self.data = data
                self.tokenizer = active_tokenizer

            def __len__(self):
                return len(self.data)

            def __getitem__(self, index):
                item = self.data[index]
                encoded = self.tokenizer(
                    item["text"],
                    truncation=True,
                    padding="max_length",
                    max_length=MAX_LENGTH,
                    return_tensors="pt",
                )
                return {
                    "input_ids": encoded["input_ids"].squeeze(0),
                    "attention_mask": encoded["attention_mask"].squeeze(0),
                    "labels": torch.tensor(label2id[item["label"]], dtype=torch.long),
                }

        device = self.hardware["device"]
        effective_batch_size = batch_size or self.hardware["recommended_batch_size"]
        if effective_batch_size < 1:
            return {"success": False, "status": "invalid_configuration", "message": "batch_size must be positive"}

        generator = torch.Generator()
        generator.manual_seed(seed)
        train_loader = DataLoader(
            RequirementDataset(train_data, tokenizer),
            batch_size=effective_batch_size,
            shuffle=True,
            generator=generator,
        )
        val_loader = DataLoader(
            RequirementDataset(val_data, tokenizer),
            batch_size=effective_batch_size,
            shuffle=False,
        )

        model.to(device)
        optimizer = torch.optim.AdamW(model.parameters(), lr=lr)
        total_steps = len(train_loader) * epochs
        warmup_steps = int(total_steps * warmup_ratio)
        scheduler = get_linear_schedule_with_warmup(
            optimizer,
            num_warmup_steps=warmup_steps,
            num_training_steps=total_steps,
        )

        start_time = time.time()
        best_val_loss = float("inf")
        best_epoch = None
        best_state = None
        epoch_history = []

        try:
            for epoch in range(epochs):
                model.train()
                total_train_loss = 0.0
                train_examples = 0

                for batch in train_loader:
                    optimizer.zero_grad(set_to_none=True)
                    input_ids = batch["input_ids"].to(device)
                    attention_mask = batch["attention_mask"].to(device)
                    labels = batch["labels"].to(device)

                    outputs = model(
                        input_ids=input_ids,
                        attention_mask=attention_mask,
                        labels=labels,
                    )
                    loss = outputs.loss
                    loss.backward()
                    torch.nn.utils.clip_grad_norm_(model.parameters(), MAX_GRAD_NORM)
                    optimizer.step()
                    scheduler.step()

                    count = int(labels.shape[0])
                    total_train_loss += float(loss.item()) * count
                    train_examples += count

                train_loss = total_train_loss / max(train_examples, 1)
                val_loss = self._evaluate_loss(model, val_loader, device)
                epoch_history.append({
                    "epoch": epoch + 1,
                    "train_loss": round(train_loss, 6),
                    "validation_loss": round(val_loss, 6),
                })

                if val_loss < best_val_loss:
                    best_val_loss = val_loss
                    best_epoch = epoch + 1
                    best_state = {
                        key: value.detach().cpu().clone()
                        for key, value in model.state_dict().items()
                    }

        except (RuntimeError, torch.cuda.OutOfMemoryError) as exc:
            is_oom = isinstance(exc, torch.cuda.OutOfMemoryError) or "out of memory" in str(exc).lower()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            return {
                "success": False,
                "status": "out_of_memory" if is_oom else "training_failed",
                "message": (
                    "RoBERTa training ran out of memory. Reduce batch_size (try 1 or 2), "
                    "or use CPU."
                    if is_oom else f"RoBERTa training failed: {exc}"
                ),
            }
        except ValueError as exc:
            return {"success": False, "status": "invalid_split", "message": str(exc)}

        if best_state is None:
            return {"success": False, "status": "checkpoint_unavailable", "message": "No validation checkpoint was produced."}

        model.load_state_dict(best_state)
        model.to(device)
        model.eval()
        duration = time.time() - start_time

        # Evaluate the selected validation checkpoint once on the held-out test set.
        y_test = [item["label"] for item in test_data]
        y_pred = []
        test_loader = DataLoader(
            RequirementDataset(test_data, tokenizer),
            batch_size=effective_batch_size,
            shuffle=False,
        )
        try:
            with torch.no_grad():
                for batch in test_loader:
                    inputs = {
                        "input_ids": batch["input_ids"].to(device),
                        "attention_mask": batch["attention_mask"].to(device),
                    }
                    logits = model(**inputs).logits
                    predicted_ids = torch.argmax(logits, dim=1).detach().cpu().tolist()
                    y_pred.extend(TAXONOMY_CATEGORIES[index] for index in predicted_ids)
        except (RuntimeError, torch.cuda.OutOfMemoryError) as exc:
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            return {
                "success": False,
                "status": "out_of_memory" if "out of memory" in str(exc).lower() else "evaluation_failed",
                "message": f"Held-out test evaluation failed: {exc}",
            }

        test_metrics = calculate_metrics(y_test, y_pred)
        bootstrap_ci = bootstrap_macro_f1_ci(y_test, y_pred)
        confusion = compute_confusion_matrix_data(y_test, y_pred)

        paths = _paths_for_mode(mode)
        os.makedirs(paths["artifact_dir"], exist_ok=True)
        tokenizer.save_pretrained(paths["artifact_dir"])
        model.save_pretrained(paths["artifact_dir"])

        metadata = {
            "trained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "mode": mode,
            "seed": seed,
            "train_samples": len(train_data),
            "val_samples": len(val_data),
            "test_samples": len(test_data),
            "epochs_requested": epochs,
            "best_epoch": best_epoch,
            "best_validation_loss": round(best_val_loss, 6),
            "epoch_history": epoch_history,
            "learning_rate": lr,
            "warmup_ratio": warmup_ratio,
            "warmup_steps": warmup_steps,
            "batch_size": effective_batch_size,
            "max_grad_norm": MAX_GRAD_NORM,
            "max_length": MAX_LENGTH,
            "device": device,
            "device_name": self.hardware["device_name"],
            "duration_seconds": round(duration, 3),
            "classes": TAXONOMY_CATEGORIES,
            "checkpoint_selection": "lowest_validation_loss",
        }
        evaluation = {
            "model": "RoBERTa-base (Arm 2)",
            "mode": mode,
            "selected_epoch": best_epoch,
            "test_metrics": test_metrics,
            "bootstrap_ci": bootstrap_ci,
            "confusion_matrix": confusion,
        }

        with open(paths["metadata"], "w", encoding="utf-8") as handle:
            json.dump(metadata, handle, indent=2)
        with open(paths["evaluation"], "w", encoding="utf-8") as handle:
            json.dump(evaluation, handle, indent=2)

        # Never replace the active gold inference instance with exploratory weights.
        if mode == "gold":
            self.tokenizer = tokenizer
            self.model = model
            self.metadata = metadata
            self.is_loaded = True

        return {
            "success": True,
            "status": "trained",
            "message": (
                f"RoBERTa-base fine-tuning complete. Best checkpoint: epoch {best_epoch}; "
                f"validation loss: {best_val_loss:.6f}."
            ),
            "metadata": metadata,
            "evaluation": evaluation,
        }

    def classify(self, text: str) -> Dict[str, Any]:
        """Run inference only with a loaded gold-mode checkpoint."""
        if (
            not self.is_loaded
            or self.model is None
            or self.tokenizer is None
            or not self.metadata
            or self.metadata.get("mode") != "gold"
        ):
            return {
                "requirement_category": "NON_ACTIONABLE",
                "confidence": 0.0,
                "model": "RoBERTa-base (4-way Sequence Classification)",
                "method": "Fine-Tuned RoBERTa (Transformer)",
                "status": "awaiting_data",
                "errorMessage": (
                    "RoBERTa-base gold-mode model is not trained. "
                    "Exploratory-only artifacts are not used for formal classification."
                ),
            }

        clean_text = (text or "").strip()
        if not clean_text:
            return {
                "requirement_category": "NON_ACTIONABLE",
                "confidence": 0.0,
                "model": "RoBERTa-base (4-way Sequence Classification)",
                "method": "Fine-Tuned RoBERTa (Transformer)",
                "status": "error",
                "errorMessage": "Input feedback text is empty.",
            }

        start = time.perf_counter()
        inputs = self.tokenizer(
            clean_text,
            truncation=True,
            padding=True,
            max_length=MAX_LENGTH,
            return_tensors="pt",
        ).to(self.hardware["device"])

        with torch.no_grad():
            logits = self.model(**inputs).logits.squeeze(0).cpu().numpy()
            probabilities = softmax(logits)

        best_index = int(np.argmax(probabilities))
        decision_scores = {
            TAXONOMY_CATEGORIES[index]: round(float(probabilities[index]), 3)
            for index in range(len(TAXONOMY_CATEGORIES))
        }
        return {
            "requirement_category": TAXONOMY_CATEGORIES[best_index],
            "confidence": round(float(probabilities[best_index]), 3),
            "model": "RoBERTa-base (4-way Sequence Classification)",
            "method": "Fine-Tuned RoBERTa (Transformer)",
            "decision_scores": decision_scores,
            "status": "success",
            "latencyMs": round((time.perf_counter() - start) * 1000, 2),
        }
