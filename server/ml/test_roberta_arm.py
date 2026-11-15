"""Focused tests for RoBERTa artifact isolation and training safeguards."""

import json
import os
import tempfile
import unittest
from unittest.mock import patch

from server.ml import roberta_arm
from server.ml.roberta_arm import RobertaClassifierArm
from server.ml.split_manager import TAXONOMY_CATEGORIES, assign_review_to_split


class TestRobertaArmSafeguards(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = self.temp_dir.name
        self.gold_dir = os.path.join(self.root, "roberta")
        self.exploratory_dir = os.path.join(self.root, "roberta_exploratory")
        self.patches = [
            patch.object(roberta_arm, "ARTIFACT_ROOT", self.root),
            patch.object(roberta_arm, "ROBERTA_ARTIFACT_DIR", self.gold_dir),
        ]
        for active_patch in self.patches:
            active_patch.start()

    def tearDown(self):
        for active_patch in reversed(self.patches):
            active_patch.stop()
        self.temp_dir.cleanup()

    @staticmethod
    def write_fake_artifact(directory, mode):
        os.makedirs(directory, exist_ok=True)
        for filename in ("config.json", "model.safetensors"):
            with open(os.path.join(directory, filename), "w", encoding="utf-8") as handle:
                handle.write("{}")
        with open(os.path.join(directory, "roberta_metadata.json"), "w", encoding="utf-8") as handle:
            json.dump({"mode": mode, "best_epoch": 2}, handle)
        with open(os.path.join(directory, "roberta_evaluation.json"), "w", encoding="utf-8") as handle:
            json.dump({"mode": mode, "test_metrics": {"macro_f1": 0.5}}, handle)

    def test_gold_and_exploratory_artifact_directories_are_distinct(self):
        gold = roberta_arm._paths_for_mode("gold")
        exploratory = roberta_arm._paths_for_mode("exploratory")
        self.assertNotEqual(gold["artifact_dir"], exploratory["artifact_dir"])
        self.assertEqual(gold["artifact_dir"], self.gold_dir)
        self.assertEqual(exploratory["artifact_dir"], self.exploratory_dir)

    def test_status_reads_evaluation_from_requested_mode_only(self):
        self.write_fake_artifact(self.gold_dir, "gold")
        self.write_fake_artifact(self.exploratory_dir, "exploratory")
        arm = object.__new__(RobertaClassifierArm)
        arm.hardware = {"device": "cpu", "device_name": "CPU"}

        gold_status = arm.get_status(records=[], mode="gold")
        exploratory_status = arm.get_status(records=[], mode="exploratory")

        self.assertTrue(gold_status["is_trained"])
        self.assertEqual(gold_status["evaluation"]["mode"], "gold")
        self.assertTrue(exploratory_status["is_trained"])
        self.assertEqual(exploratory_status["evaluation"]["mode"], "exploratory")

    def test_exploratory_weights_cannot_be_used_for_gold_classification(self):
        arm = object.__new__(RobertaClassifierArm)
        arm.hardware = {"device": "cpu"}
        arm.is_loaded = True
        arm.model = object()
        arm.tokenizer = object()
        arm.metadata = {"mode": "exploratory"}

        result = arm.classify("Please add an export option.")
        self.assertEqual(result["status"], "awaiting_data")
        self.assertEqual(result["confidence"], 0.0)

    def test_training_refuses_insufficient_gold_data_before_loading_transformers(self):
        records = [
            {
                "id": str(index),
                "review_id": f"review-{index}",
                "text": "A sample sentence.",
                "humanAnnotations": {"adjudicated": TAXONOMY_CATEGORIES[index % 4]},
            }
            for index in range(8)
        ]
        arm = object.__new__(RobertaClassifierArm)
        result = arm.train(records, mode="gold")
        self.assertFalse(result["success"])
        self.assertEqual(result["status"], "insufficient_data")

    def test_training_refuses_empty_validation_or_test_partition(self):
        records = []
        index = 0
        for category in TAXONOMY_CATEGORIES:
            found = 0
            candidate = 0
            while found < 4:
                review_id = f"train-only-{category}-{candidate}"
                candidate += 1
                if assign_review_to_split(review_id) != "train":
                    continue
                records.append({
                    "id": f"record-{index}",
                    "review_id": review_id,
                    "text": f"Example sentence for {category} {index}.",
                    "humanAnnotations": {"adjudicated": category},
                })
                index += 1
                found += 1

        arm = object.__new__(RobertaClassifierArm)
        result = arm.train(records, mode="gold")
        self.assertFalse(result["success"])
        self.assertEqual(result["status"], "invalid_split")
        self.assertEqual(result["split_counts"]["val"], 0)
        self.assertEqual(result["split_counts"]["test"], 0)

    def test_validation_loss_rejects_empty_validation_loader(self):
        class DummyModel:
            def eval(self):
                return self

        with self.assertRaisesRegex(ValueError, "Validation partition is empty"):
            RobertaClassifierArm._evaluate_loss(DummyModel(), [], "cpu")


if __name__ == "__main__":
    unittest.main()
