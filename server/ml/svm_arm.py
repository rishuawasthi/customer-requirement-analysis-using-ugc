"""
Formal Model Arm 1: TF-IDF + Linear SVM Classifier
Implements Section IV-A of the research manuscript:
- Unigram and bigram TF-IDF representations (ngram_range=(1, 2))
- Linear Support Vector Classifier (LinearSVC) with class_weight='balanced'
- Review-level group partitioning to prevent data leakage
- Calibrated decision scores for continuous confidence estimation
"""

import os
import time
import numpy as np
import joblib
from typing import Dict, Any, List, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from scipy.special import softmax

from .split_manager import (
    TAXONOMY_CATEGORIES,
    partition_records,
    get_dataset_statistics,
    load_adjudicated_data
)

ARTIFACT_DIR = os.path.join(os.path.dirname(__file__), 'artifacts')
MODEL_PATH = os.path.join(ARTIFACT_DIR, 'svm_model.joblib')
METADATA_PATH = os.path.join(ARTIFACT_DIR, 'svm_metadata.json')


class SvmClassifierArm:
    def __init__(self):
        self.model = None
        self.vectorizer = None
        self.metadata = None
        self.is_loaded = False
        self._load_artifact()

    def _load_artifact(self):
        if os.path.exists(MODEL_PATH):
            try:
                bundle = joblib.load(MODEL_PATH)
                self.vectorizer = bundle.get('vectorizer')
                self.model = bundle.get('model')
                self.metadata = bundle.get('metadata', {})
                self.is_loaded = True
            except Exception as e:
                print(f"[SVM Arm] Warning: Failed to load model artifact: {e}")
                self.is_loaded = False

    def get_status(self, records: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        """Reports model artifact readiness and dataset training eligibility."""
        stats = get_dataset_statistics(records or load_adjudicated_data())
        return {
            'model_name': 'LinearSVC (Unigram+Bigram TF-IDF)',
            'status': 'trained' if self.is_loaded else 'awaiting_data',
            'is_trained': self.is_loaded,
            'artifact_path': MODEL_PATH if self.is_loaded else None,
            'training_metadata': self.metadata if self.is_loaded else None,
            'dataset_status': stats
        }

    def train(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Trains the Linear SVM on verified adjudicated training partition.
        Refuses to train if dataset lacks sufficient adjudicated examples per class.
        """
        stats = get_dataset_statistics(records)
        eligibility = stats['training_eligibility']

        if not eligibility['is_eligible']:
            missing_details = [
                f"{cat}: have {info['train_count']}, need {info['required']} (missing {info['missing']})"
                for cat, info in eligibility['per_class_status'].items()
                if info['missing'] > 0
            ]
            return {
                'success': False,
                'status': 'insufficient_data',
                'message': (
                    f"Supervised Linear SVM training requires at least {eligibility['min_records_per_class']} "
                    f"adjudicated training examples per category. Missing: {'; '.join(missing_details)}. "
                    "No synthetic pseudo-labels are used."
                ),
                'details': eligibility
            }

        # Filter only adjudicated records with valid taxonomy category
        adjudicated = []
        for r in records:
            ha = r.get('humanAnnotations') or {}
            adj = ha.get('adjudicated') or r.get('adjudicated')
            if adj and adj in TAXONOMY_CATEGORIES:
                adjudicated.append({
                    'id': r.get('id'),
                    'text': r.get('text', '').strip(),
                    'review_id': r.get('reviewId') or r.get('review_id') or r.get('id'),
                    'label': adj
                })

        splits = partition_records(adjudicated)
        train_data = splits['train']
        val_data = splits['val']

        X_train = [r['text'] for r in train_data]
        y_train = [r['label'] for r in train_data]

        start_time = time.time()

        # Manuscript specification: unigram + bigram TF-IDF with sublinear tf
        vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            sublinear_tf=True,
            min_df=1,
            strip_accents='unicode',
            lowercase=True
        )
        X_train_vec = vectorizer.fit_transform(X_train)

        # Manuscript specification: LinearSVC with class-balanced weighting
        clf = LinearSVC(
            class_weight='balanced',
            random_state=42,
            max_iter=3000,
            tol=1e-4
        )
        clf.fit(X_train_vec, y_train)
        training_duration = time.time() - start_time

        # Validation evaluation
        val_metrics = {}
        if len(val_data) > 0:
            X_val = [r['text'] for r in val_data]
            y_val = [r['label'] for r in val_data]
            X_val_vec = vectorizer.transform(X_val)
            y_pred = clf.predict(X_val_vec)

            acc = accuracy_score(y_val, y_pred)
            prec, rec, f1, _ = precision_recall_fscore_support(
                y_val, y_pred, average='macro', zero_division=0
            )
            val_metrics = {
                'validation_samples': len(val_data),
                'accuracy': round(float(acc), 4),
                'macro_precision': round(float(prec), 4),
                'macro_recall': round(float(rec), 4),
                'macro_f1': round(float(f1), 4)
            }

        # Save bundle
        metadata = {
            'trained_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            'train_samples': len(train_data),
            'val_samples': len(val_data),
            'training_duration_seconds': round(training_duration, 3),
            'classes': list(clf.classes_),
            'validation_metrics': val_metrics
        }

        os.makedirs(ARTIFACT_DIR, exist_ok=True)
        joblib.dump({'vectorizer': vectorizer, 'model': clf, 'metadata': metadata}, MODEL_PATH)

        self.vectorizer = vectorizer
        self.model = clf
        self.metadata = metadata
        self.is_loaded = True

        return {
            'success': True,
            'status': 'trained',
            'message': f"Linear SVM successfully trained on {len(train_data)} adjudicated records.",
            'metadata': metadata
        }

    def classify(self, text: str) -> Dict[str, Any]:
        """Performs inference using the trained Linear SVM."""
        if not self.is_loaded or self.model is None or self.vectorizer is None:
            return {
                'requirement_category': 'NON_ACTIONABLE',
                'confidence': 0.0,
                'model': 'LinearSVC (TF-IDF 1-2 gram)',
                'method': 'Supervised Linear SVM',
                'status': 'awaiting_data',
                'errorMessage': 'Linear SVM model is not trained yet. Adjudicate training data via the Workbench to train.'
            }

        clean_text = (text or '').strip()
        if not clean_text:
            return {
                'requirement_category': 'NON_ACTIONABLE',
                'confidence': 0.0,
                'model': 'LinearSVC (TF-IDF 1-2 gram)',
                'method': 'Supervised Linear SVM',
                'status': 'error',
                'errorMessage': 'Input feedback text is empty.'
            }

        start = time.perf_counter()
        X_vec = self.vectorizer.transform([clean_text])
        pred_label = self.model.predict(X_vec)[0]

        # Calculate decision function scores and calibrate to probabilities via softmax
        decision_scores = self.model.decision_function(X_vec)
        if decision_scores.ndim == 1:
            # Binary fallback
            probs = softmax([decision_scores[0], -decision_scores[0]])
            decision_dict = {self.model.classes_[0]: float(decision_scores[0])}
            conf = float(probs[0])
        else:
            probs = softmax(decision_scores[0])
            classes = list(self.model.classes_)
            decision_dict = {cls_name: round(float(decision_scores[0][idx]), 3) for idx, cls_name in enumerate(classes)}
            pred_idx = classes.index(pred_label)
            conf = float(probs[pred_idx])

        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

        return {
            'requirement_category': pred_label,
            'confidence': round(conf, 3),
            'model': 'LinearSVC (TF-IDF 1-2 gram)',
            'method': 'Supervised Linear SVM',
            'decision_scores': decision_dict,
            'status': 'success',
            'latencyMs': elapsed_ms
        }
