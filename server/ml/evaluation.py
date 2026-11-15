"""
Academic Evaluation and Metrics Module
Implements Section VII & VIII of the research manuscript:
- Primary metric: Macro-F1 (unweighted arithmetic mean across 4 categories)
- Secondary metrics: Accuracy, Weighted-F1, per-class Precision, Recall, F1, and Support
- Non-parametric 95% bootstrap confidence interval (1,000 iterations, seed=42)
- 4x4 Confusion Matrix (raw and normalized)
- Qualitative error analysis and misclassification extraction
"""

import json
from typing import Dict, Any, List, Tuple, Optional
import numpy as np
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

TAXONOMY_CATEGORIES = ['EXPLICIT_NEED', 'IMPLICIT_NEED', 'PAIN_POINT', 'NON_ACTIONABLE']


def calculate_metrics(y_true: List[str], y_pred: List[str]) -> Dict[str, Any]:
    """
    Computes primary Macro-F1, Accuracy, Weighted-F1, and per-class metrics
    across the four research taxonomy categories.
    """
    if not y_true or not y_pred or len(y_true) != len(y_pred):
        return {
            'accuracy': 0.0,
            'macro_f1': 0.0,
            'weighted_f1': 0.0,
            'sample_count': 0,
            'per_class': {}
        }

    acc = float(accuracy_score(y_true, y_pred))

    # Per-class P, R, F1, Support
    p, r, f1, sup = precision_recall_fscore_support(
        y_true,
        y_pred,
        labels=TAXONOMY_CATEGORIES,
        zero_division=0
    )

    per_class = {}
    for idx, cat in enumerate(TAXONOMY_CATEGORIES):
        per_class[cat] = {
            'precision': round(float(p[idx]), 4),
            'recall': round(float(r[idx]), 4),
            'f1_score': round(float(f1[idx]), 4),
            'support': int(sup[idx])
        }

    macro_f1 = float(np.mean(f1))
    weighted_p, weighted_r, weighted_f1, _ = precision_recall_fscore_support(
        y_true,
        y_pred,
        average='weighted',
        zero_division=0
    )

    return {
        'accuracy': round(acc, 4),
        'macro_f1': round(macro_f1, 4),
        'weighted_f1': round(float(weighted_f1), 4),
        'sample_count': len(y_true),
        'per_class': per_class
    }


def bootstrap_macro_f1_ci(
    y_true: List[str],
    y_pred: List[str],
    n_iterations: int = 1000,
    alpha: float = 0.05,
    seed: int = 42
) -> Dict[str, Any]:
    """
    Calculates non-parametric 95% bootstrap confidence interval for Macro-F1
    using percentile bootstrap resampling (n=1,000, seed=42).
    """
    if len(y_true) < 2 or len(y_true) != len(y_pred):
        return {'ci_lower': 0.0, 'ci_upper': 0.0, 'iterations': 0, 'confidence': 0.95}

    rng = np.random.RandomState(seed)
    n = len(y_true)
    y_true_arr = np.array(y_true)
    y_pred_arr = np.array(y_pred)

    bootstrapped_scores = []
    for _ in range(n_iterations):
        indices = rng.randint(0, n, size=n)
        sample_true = y_true_arr[indices]
        sample_pred = y_pred_arr[indices]

        # Compute Macro-F1 for this bootstrap sample
        _, _, f1, _ = precision_recall_fscore_support(
            sample_true,
            sample_pred,
            labels=TAXONOMY_CATEGORIES,
            zero_division=0
        )
        bootstrapped_scores.append(float(np.mean(f1)))

    lower_pct = 100 * (alpha / 2.0)
    upper_pct = 100 * (1.0 - (alpha / 2.0))

    ci_lower = float(np.percentile(bootstrapped_scores, lower_pct))
    ci_upper = float(np.percentile(bootstrapped_scores, upper_pct))

    return {
        'ci_lower': round(ci_lower, 4),
        'ci_upper': round(ci_upper, 4),
        'ci_formatted': f"[{round(ci_lower, 4):.4f}, {round(ci_upper, 4):.4f}]",
        'iterations': n_iterations,
        'confidence': 1.0 - alpha
    }


def compute_confusion_matrix_data(y_true: List[str], y_pred: List[str]) -> Dict[str, Any]:
    """
    Computes 4x4 confusion matrix with raw counts and row-normalized percentages.
    """
    if not y_true or not y_pred:
        cm_zeros = [[0] * 4 for _ in range(4)]
        return {
            'labels': TAXONOMY_CATEGORIES,
            'matrix': cm_zeros,
            'normalized_matrix': cm_zeros
        }

    cm = confusion_matrix(y_true, y_pred, labels=TAXONOMY_CATEGORIES)
    raw_matrix = cm.tolist()

    # Row-normalized (recall-normalized percentages)
    with np.errstate(divide='ignore', invalid='ignore'):
        row_sums = cm.sum(axis=1, keepdims=True)
        norm_cm = np.where(row_sums > 0, cm.astype('float') / row_sums, 0.0)

    normalized_matrix = [[round(float(val), 4) for val in row] for row in norm_cm]

    return {
        'labels': TAXONOMY_CATEGORIES,
        'matrix': raw_matrix,
        'normalized_matrix': normalized_matrix
    }


def extract_error_analysis(
    records: List[Dict[str, Any]],
    y_true: List[str],
    y_pred: List[str],
    confidences: Optional[List[float]] = None
) -> List[Dict[str, Any]]:
    """
    Extracts all misclassified instances with ground truth, prediction,
    model confidence, and boundary confusion classification.
    """
    errors = []
    for idx, (true_label, pred_label) in enumerate(zip(y_true, y_pred)):
        if true_label != pred_label:
            rec = records[idx] if idx < len(records) else {}
            conf = confidences[idx] if confidences and idx < len(confidences) else 0.0

            # Determine boundary confusion category
            is_implicit_pain_confusion = (
                (true_label == 'IMPLICIT_NEED' and pred_label == 'PAIN_POINT') or
                (true_label == 'PAIN_POINT' and pred_label == 'IMPLICIT_NEED')
            )
            is_explicit_implicit_confusion = (
                (true_label == 'EXPLICIT_NEED' and pred_label == 'IMPLICIT_NEED') or
                (true_label == 'IMPLICIT_NEED' and pred_label == 'EXPLICIT_NEED')
            )

            confusion_type = 'GENERAL_ERROR'
            if is_implicit_pain_confusion:
                confusion_type = 'IMPLICIT_VS_PAIN_POINT'
            elif is_explicit_implicit_confusion:
                confusion_type = 'EXPLICIT_VS_IMPLICIT'

            errors.append({
                'record_id': rec.get('id', f"REC_{idx}"),
                'review_id': rec.get('review_id') or rec.get('reviewId', 'N/A'),
                'text': rec.get('text', ''),
                'ground_truth': true_label,
                'predicted': pred_label,
                'confidence': round(float(conf), 4),
                'confusion_type': confusion_type
            })

    return errors
