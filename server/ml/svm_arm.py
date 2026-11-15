"""
Formal Model Arm 1: TF-IDF + Linear SVM Classifier
Implements Section IV-A of the research manuscript:
- Unigram and bigram TF-IDF representations (ngram_range=(1, 2))
- Linear Support Vector Classifier (LinearSVC) with class_weight='balanced'
- Review-level group partitioning to prevent data leakage
- Calibrated decision scores for continuous confidence estimation
- Evaluation with 95% bootstrap CI, 4x4 confusion matrix, and error analysis
"""

import os
import time
import json
import numpy as np
import joblib
from typing import Dict, Any, List, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from scipy.special import softmax

from .split_manager import (
    TAXONOMY_CATEGORIES,
    partition_records,
    get_dataset_statistics,
    load_adjudicated_data
)
from .evaluation import (
    calculate_metrics,
    bootstrap_macro_f1_ci,
    compute_confusion_matrix_data,
    extract_error_analysis
)

ARTIFACT_DIR = os.path.join(os.path.dirname(__file__), 'artifacts')
MODEL_PATH = os.path.join(ARTIFACT_DIR, 'svm_model.joblib')
METADATA_PATH = os.path.join(ARTIFACT_DIR, 'svm_metadata.json')
EVAL_PATH = os.path.join(ARTIFACT_DIR, 'svm_evaluation.json')


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

    def get_status(self, records: Optional[List[Dict[str, Any]]] = None, mode: str = 'gold') -> Dict[str, Any]:
        """Reports model artifact readiness, evaluation status, and training eligibility."""
        stats = get_dataset_statistics(records or load_adjudicated_data(), mode=mode)
        eval_data = None
        if os.path.exists(EVAL_PATH):
            try:
                with open(EVAL_PATH, 'r', encoding='utf-8') as f:
                    eval_data = json.load(f)
            except Exception:
                eval_data = None

        # Never expose exploratory metrics in the formal gold-mode view (or vice versa).
        if eval_data and eval_data.get('mode') != mode:
            eval_data = None

        metadata_matches_mode = bool(self.metadata and self.metadata.get('mode') == mode)

        return {
            'model_name': 'LinearSVC (Unigram+Bigram TF-IDF)',
            'status': 'trained' if self.is_loaded and metadata_matches_mode else 'awaiting_data',
            'is_trained': self.is_loaded and metadata_matches_mode,
            'artifact_path': MODEL_PATH if self.is_loaded and metadata_matches_mode else None,
            'training_metadata': self.metadata if metadata_matches_mode else None,
            'dataset_status': stats,
            'evaluation': eval_data
        }

    def train(self, records: List[Dict[str, Any]], mode: str = 'gold') -> Dict[str, Any]:
        """
        Trains the Linear SVM on verified training partition.
        In mode='gold': requires adjudicated human labels.
        In mode='exploratory': uses weak/exploratory labels.
        """
        stats = get_dataset_statistics(records, mode=mode)
        eligibility = stats['training_eligibility']

        if not eligibility['is_eligible']:
            missing_details = [
                f"{cat}: have {info['train_count']}, need {info['required']} (missing {info['missing']})"
                for cat, info in eligibility['per_class_status'].items()
                if info['missing'] > 0
            ]
            qualifier = "adjudicated training examples" if mode == 'gold' else "training examples"
            return {
                'success': False,
                'status': 'insufficient_data',
                'message': (
                    f"Supervised Linear SVM training requires at least {eligibility['min_records_per_class']} "
                    f"{qualifier} per category. Missing: {'; '.join(missing_details)}."
                ),
                'details': eligibility
            }

        # Filter records with valid taxonomy category
        usable_records = []
        for r in records:
            ha = r.get('humanAnnotations') or {}
            label = None
            if mode == 'gold':
                adj = ha.get('adjudicated') or r.get('adjudicated')
                if adj and adj in TAXONOMY_CATEGORIES:
                    label = adj
            else:
                label = r.get('exploratoryLabel') or r.get('predictedCategory') or ha.get('adjudicated') or r.get('adjudicated')
                if label not in TAXONOMY_CATEGORIES:
                    label = None

            if label:
                usable_records.append({
                    'id': r.get('id'),
                    'text': r.get('text', '').strip(),
                    'review_id': r.get('reviewId') or r.get('review_id') or r.get('id'),
                    'label': label
                })

        splits = partition_records(usable_records)
        train_data = splits['train']
        val_data = splits['val']
        test_data = splits['test']

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

        # Manuscript specification: LinearSVC with balanced class weights
        clf = LinearSVC(
            C=1.0,
            class_weight='balanced',
            max_iter=3000,
            random_state=42,
            dual='auto'
        )
        clf.fit(X_train_vec, y_train)

        train_duration = time.time() - start_time

        # Validation evaluation
        val_metrics = {}
        if val_data:
            X_val = [r['text'] for r in val_data]
            y_val = [r['label'] for r in val_data]
            X_val_vec = vectorizer.transform(X_val)
            y_val_pred = clf.predict(X_val_vec).tolist()
            val_metrics = calculate_metrics(y_val, y_val_pred)

        # Test partition evaluation
        test_metrics = {}
        confusion = {}
        bootstrap_ci = {}
        if test_data:
            X_test = [r['text'] for r in test_data]
            y_test = [r['label'] for r in test_data]
            X_test_vec = vectorizer.transform(X_test)
            y_test_pred = clf.predict(X_test_vec).tolist()
            test_metrics = calculate_metrics(y_test, y_test_pred)
            confusion = compute_confusion_matrix_data(y_test, y_test_pred)
            bootstrap_ci = bootstrap_macro_f1_ci(y_test, y_test_pred)

        os.makedirs(ARTIFACT_DIR, exist_ok=True)
        metadata = {
            'trained_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            'train_duration_sec': round(train_duration, 4),
            'training_samples': len(train_data),
            'validation_samples': len(val_data),
            'test_samples': len(test_data),
            'class_distribution': dict(stats['splits']['train']['class_distribution']),
            'validation_metrics': val_metrics,
            'test_metrics': test_metrics,
            'bootstrap_ci': bootstrap_ci,
            'mode': mode
        }

        # Save bundle
        bundle = {
            'vectorizer': vectorizer,
            'model': clf,
            'metadata': metadata
        }
        joblib.dump(bundle, MODEL_PATH)

        with open(METADATA_PATH, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2)

        # Save evaluation report
        eval_report = {
            'model': 'TF-IDF + Linear SVM (Arm 1)',
            'mode': mode,
            'test_metrics': test_metrics,
            'bootstrap_ci': bootstrap_ci,
            'confusion_matrix': confusion,
            'val_metrics': val_metrics
        }
        with open(EVAL_PATH, 'w', encoding='utf-8') as f:
            json.dump(eval_report, f, indent=2)

        self.model = clf
        self.vectorizer = vectorizer
        self.metadata = metadata
        self.is_loaded = True

        return {
            'success': True,
            'status': 'trained',
            'message': f"Linear SVM successfully trained on {len(train_data)} examples.",
            'metadata': metadata,
            'evaluation': eval_report
        }

    def evaluate(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Evaluates loaded SVM on given records."""
        if not self.is_loaded or self.model is None or self.vectorizer is None:
            return {'status': 'awaiting_data', 'message': 'Model is not trained yet.'}

        y_true = [r.get('label') or r.get('adjudicated') for r in records]
        X = [r.get('text', '') for r in records]

        X_vec = self.vectorizer.transform(X)
        y_pred = self.model.predict(X_vec).tolist()

        decision_scores = self.model.decision_function(X_vec)
        if len(self.model.classes_) == 2:
            probs = softmax(np.column_stack([-decision_scores, decision_scores]), axis=1)
        else:
            probs = softmax(decision_scores, axis=1)
        confidences = [float(np.max(p)) for p in probs]

        metrics = calculate_metrics(y_true, y_pred)
        ci = bootstrap_macro_f1_ci(y_true, y_pred)
        cm = compute_confusion_matrix_data(y_true, y_pred)
        errors = extract_error_analysis(records, y_true, y_pred, confidences)

        return {
            'status': 'evaluated',
            'metrics': metrics,
            'bootstrap_ci': ci,
            'confusion_matrix': cm,
            'error_count': len(errors),
            'errors': errors
        }

    def classify(self, text: str) -> Dict[str, Any]:
        """Classifies an input text using the trained Linear SVM."""
        if not self.is_loaded or self.model is None or self.vectorizer is None:
            return {
                'requirement_category': 'NON_ACTIONABLE',
                'category': 'NON_ACTIONABLE',
                'confidence': 0.0,
                'model': 'LinearSVC (Unigram+Bigram TF-IDF)',
                'method': 'Traditional ML (TF-IDF + Linear SVM)',
                'status': 'awaiting_data',
                'explanation': 'Linear SVM arm awaiting adjudicated training data.',
                'per_class_scores': {},
                'decision_scores': {}
            }

        clean_text = (text or '').strip()
        if not clean_text:
            return {
                'requirement_category': 'NON_ACTIONABLE',
                'category': 'NON_ACTIONABLE',
                'confidence': 0.0,
                'model': 'LinearSVC (Unigram+Bigram TF-IDF)',
                'method': 'Traditional ML (TF-IDF + Linear SVM)',
                'status': 'error',
                'explanation': 'Empty input text provided.',
                'errorMessage': 'Empty input text provided.',
                'per_class_scores': {},
                'decision_scores': {}
            }

        start = time.perf_counter()
        X_vec = self.vectorizer.transform([clean_text])
        predicted_category = self.model.predict(X_vec)[0]

        decision_scores = self.model.decision_function(X_vec)[0]
        classes = list(self.model.classes_)

        if len(classes) == 2:
            probs = softmax([-decision_scores, decision_scores])
        else:
            probs = softmax(decision_scores)

        scores_dict = {
            cls_name: round(float(probs[idx]), 4)
            for idx, cls_name in enumerate(classes)
        }
        confidence = float(scores_dict.get(predicted_category, 0.0))
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

        return {
            'requirement_category': predicted_category,
            'category': predicted_category,
            'confidence': round(confidence, 4),
            'confidence_is_calibrated': False,
            'confidence_kind': 'softmax_transformed_decision_margin',
            'model': 'LinearSVC (Unigram+Bigram TF-IDF)',
            'method': 'Traditional ML (TF-IDF + Linear SVM)',
            'status': 'success',
            'explanation': f"Classified by Linear SVM; displayed score is a softmax-transformed decision margin, not a calibrated probability ( {round(confidence * 100, 1)}%).",
            'per_class_scores': scores_dict,
            'decision_scores': scores_dict,
            'latencyMs': elapsed_ms
        }
