"""
Unit and Integration Tests for Python ML Pipeline
Tests:
1. Review ID-based split determinism and zero data leakage
2. Training refusal when adjudicated data is below threshold
3. End-to-end SVM training, calibration, persistence, and inference on eligible data
4. Evaluation metrics (Macro-F1, accuracy, per-class metrics)
5. 95% bootstrap confidence interval estimation
6. 4x4 Confusion matrix calculation and normalization
7. Error analysis and boundary confusion categorizations
"""

import os
import shutil
import tempfile
import unittest
from unittest.mock import patch

import joblib

from server.ml.split_manager import (
    assign_review_to_split,
    partition_records,
    get_dataset_statistics,
    generate_split_manifests,
    verify_zero_leakage,
    TAXONOMY_CATEGORIES
)
from server.ml.svm_arm import SvmClassifierArm
from server.ml.evaluation import (
    calculate_metrics,
    bootstrap_macro_f1_ci,
    compute_confusion_matrix_data,
    extract_error_analysis
)


class TestMlPipeline(unittest.TestCase):
    def test_review_split_determinism_and_leakage(self):
        """Verify that sentences with the same review_id strictly stay in the same partition."""
        reviews = [f"REV_{i:03d}" for i in range(100)]
        records = []
        for rev in reviews:
            # 3 sentences per review
            for s_idx in range(3):
                records.append({
                    'id': f"{rev}_{s_idx}",
                    'review_id': rev,
                    'text': f"Sentence {s_idx} for review {rev}",
                    'label': TAXONOMY_CATEGORIES[s_idx % 4]
                })

        splits = partition_records(records)
        train_revs = set(r['review_id'] for r in splits['train'])
        val_revs = set(r['review_id'] for r in splits['val'])
        test_revs = set(r['review_id'] for r in splits['test'])

        # Check zero leakage between sets
        self.assertEqual(len(train_revs.intersection(val_revs)), 0, "Train and Val review sets must have 0 overlap")
        self.assertEqual(len(train_revs.intersection(test_revs)), 0, "Train and Test review sets must have 0 overlap")
        self.assertEqual(len(val_revs.intersection(test_revs)), 0, "Val and Test review sets must have 0 overlap")

        leak_check = verify_zero_leakage(splits)
        self.assertTrue(leak_check['zero_leakage'])

    def test_manifest_generation(self):
        """Verify that generate_split_manifests creates manifest files and validates zero leakage."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            records = [
                {'id': f"REC_{i}", 'review_id': f"REV_{i % 10}", 'text': f"Sample {i}", 'label': 'PAIN_POINT'}
                for i in range(30)
            ]
            res = generate_split_manifests(records, output_dir=tmp_dir)
            self.assertTrue(res['success'])
            self.assertTrue(res['leakage_verification']['zero_leakage'])
            for split in ['train', 'val', 'test']:
                manifest_path = os.path.join(tmp_dir, f"{split}_manifest.json")
                self.assertTrue(os.path.exists(manifest_path))

    def test_training_refusal_insufficient_data(self):
        """Verify that SVM refuses to train when adjudicated data is below threshold."""
        records = [
            {'id': '1', 'review_id': 'r1', 'text': 'sentence 1', 'adjudicated': 'EXPLICIT_NEED'},
            {'id': '2', 'review_id': 'r2', 'text': 'sentence 2', 'adjudicated': 'PAIN_POINT'}
        ]
        arm = SvmClassifierArm()
        res = arm.train(records, mode='gold')
        self.assertFalse(res['success'])
        self.assertEqual(res['status'], 'insufficient_data')
        self.assertIn('requires at least', res['message'])

    def test_evaluation_metrics_and_bootstrap_ci(self):
        """Verify calculate_metrics and bootstrap_macro_f1_ci."""
        y_true = ['EXPLICIT_NEED', 'IMPLICIT_NEED', 'PAIN_POINT', 'NON_ACTIONABLE'] * 5
        y_pred = ['EXPLICIT_NEED', 'IMPLICIT_NEED', 'PAIN_POINT', 'NON_ACTIONABLE'] * 4 + ['EXPLICIT_NEED', 'PAIN_POINT', 'PAIN_POINT', 'NON_ACTIONABLE']

        metrics = calculate_metrics(y_true, y_pred)
        self.assertIn('macro_f1', metrics)
        self.assertIn('accuracy', metrics)
        self.assertGreater(metrics['macro_f1'], 0.0)
        self.assertEqual(len(metrics['per_class']), 4)

        ci = bootstrap_macro_f1_ci(y_true, y_pred, n_iterations=100)
        self.assertIn('ci_lower', ci)
        self.assertIn('ci_upper', ci)
        self.assertLessEqual(ci['ci_lower'], ci['ci_upper'])

    def test_confusion_matrix_and_error_analysis(self):
        """Verify confusion matrix computation and error categorization."""
        y_true = ['IMPLICIT_NEED', 'EXPLICIT_NEED']
        y_pred = ['PAIN_POINT', 'IMPLICIT_NEED']
        records = [
            {'id': '1', 'review_id': 'rev1', 'text': 'Battery does not last long.'},
            {'id': '2', 'review_id': 'rev2', 'text': 'Please add dark mode.'}
        ]

        cm = compute_confusion_matrix_data(y_true, y_pred)
        self.assertEqual(len(cm['matrix']), 4)
        self.assertEqual(len(cm['matrix'][0]), 4)

        errors = extract_error_analysis(records, y_true, y_pred, confidences=[0.85, 0.90])
        self.assertEqual(len(errors), 2)
        self.assertEqual(errors[0]['confusion_type'], 'IMPLICIT_VS_PAIN_POINT')
        self.assertEqual(errors[1]['confusion_type'], 'EXPLICIT_VS_IMPLICIT')

    def test_svm_eligible_training_and_inference(self):
        """Verify that Linear SVM trains, calibrates, and infers when eligible dataset is provided."""
        records = []
        rec_id = 1
        for cat in TAXONOMY_CATEGORIES:
            for i in range(12):  # 12 samples per category across distinct reviews
                rev_id = f"REV_{cat}_{i}"
                if cat == 'EXPLICIT_NEED':
                    text = f"Please add feature {i} and update user settings."
                elif cat == 'IMPLICIT_NEED':
                    text = f"I wish the battery lasted longer than {i} hours."
                elif cat == 'PAIN_POINT':
                    text = f"The screen cracked and system crashed {i} times."
                else:
                    text = f"The restaurant had pleasant yellow lighting {i}."

                records.append({
                    'id': f"REC_{rec_id}",
                    'review_id': rev_id,
                    'text': text,
                    'humanAnnotations': {'adjudicated': cat}
                })
                rec_id += 1

        stats = get_dataset_statistics(records, mode='gold')
        self.assertTrue(stats['training_eligibility']['is_eligible'])

        arm = SvmClassifierArm()
        train_res = arm.train(records, mode='gold')
        self.assertTrue(train_res['success'])
        self.assertEqual(train_res['status'], 'trained')
        self.assertIn('validation_metrics', train_res['metadata'])

        # Test inference
        infer_res = arm.classify("Could you please add an export button?")
        self.assertEqual(infer_res['status'], 'success')
        self.assertIn(infer_res['requirement_category'], TAXONOMY_CATEGORIES)
        self.assertGreater(infer_res['confidence'], 0.0)
        self.assertIn('decision_scores', infer_res)
        self.assertGreater(infer_res['latencyMs'], 0.0)


    def test_dual_annotated_count_requires_both_human_coders(self):
        records = [
            {'id': 'both', 'text': 'A valid sentence.', 'humanAnnotations': {
                'annotatorA': 'PAIN_POINT', 'annotatorB': 'PAIN_POINT', 'adjudicated': 'PAIN_POINT'
            }},
            {'id': 'only-a', 'text': 'Another sentence.', 'humanAnnotations': {
                'annotatorA': 'PAIN_POINT', 'adjudicated': 'PAIN_POINT'
            }},
            {'id': 'only-b', 'text': 'Third sentence.', 'humanAnnotations': {
                'annotatorB': 'PAIN_POINT', 'adjudicated': 'PAIN_POINT'
            }},
        ]
        stats = get_dataset_statistics(records, mode='gold')
        self.assertEqual(stats['dual_annotated_count'], 1)
        self.assertEqual(stats['labelled_count'], 3)

    def test_blank_text_is_not_counted_as_training_data(self):
        records = [{
            'id': f'blank-{i}', 'review_id': f'blank-review-{i}',
            'text': '   ', 'humanAnnotations': {'adjudicated': category}
        } for category in TAXONOMY_CATEGORIES for i in range(5)]
        stats = get_dataset_statistics(records, mode='gold')
        self.assertEqual(stats['labelled_count'], 0)
        self.assertFalse(stats['training_eligibility']['is_eligible'])

    def test_svm_training_refuses_empty_validation_or_test_partition(self):
        records = []
        for category in TAXONOMY_CATEGORIES:
            found = 0
            candidate = 0
            while found < 4:
                review_id = f'svm-train-only-{category}-{candidate}'
                candidate += 1
                if assign_review_to_split(review_id) != 'train':
                    continue
                records.append({
                    'id': f'{category}-{found}', 'review_id': review_id,
                    'text': f'Example sentence for {category} {found}.',
                    'humanAnnotations': {'adjudicated': category}
                })
                found += 1
        result = SvmClassifierArm().train(records, mode='gold')
        self.assertFalse(result['success'])
        self.assertEqual(result['status'], 'invalid_split')
        self.assertEqual(result['split_counts']['val'], 0)
        self.assertEqual(result['split_counts']['test'], 0)

    def test_svm_gold_and_exploratory_artifacts_are_isolated(self):
        # Build deterministic, sufficiently populated partitions instead of
        # relying on a small random-looking sample of hash assignments.
        records = []
        for category in TAXONOMY_CATEGORIES:
            counts = {'train': 0, 'val': 0, 'test': 0}
            candidate = 0
            while any(count < (8 if split == 'train' else 2) for split, count in counts.items()):
                review_id = f'SVM_MODE_{category}_{candidate}'
                candidate += 1
                assigned_split = assign_review_to_split(review_id)
                required = 8 if assigned_split == 'train' else 2
                if counts[assigned_split] >= required:
                    continue
                index = counts[assigned_split]
                counts[assigned_split] += 1
                records.append({
                    'id': f'{category}-{assigned_split}-{index}',
                    'review_id': review_id,
                    'text': f'{category} example feedback from {assigned_split} partition {index}.',
                    'humanAnnotations': {'adjudicated': category},
                    'exploratoryLabel': category
                })
        with tempfile.TemporaryDirectory() as temp_root:
            with patch('server.ml.svm_arm.ARTIFACT_ROOT', temp_root), patch('server.ml.svm_arm.ARTIFACT_DIR', temp_root):
                arm = SvmClassifierArm()
                gold_result = arm.train(records, mode='gold')
                self.assertTrue(gold_result['success'], gold_result)
                gold_model_path = os.path.join(temp_root, 'svm_model.joblib')
                self.assertTrue(os.path.isfile(gold_model_path))

                exploratory_result = arm.train(records, mode='exploratory')
                self.assertTrue(exploratory_result['success'], exploratory_result)
                exploratory_model_path = os.path.join(temp_root, 'svm_exploratory', 'svm_model.joblib')
                self.assertTrue(os.path.isfile(exploratory_model_path))
                self.assertTrue(os.path.isfile(gold_model_path))

                gold_bundle = joblib.load(gold_model_path)
                self.assertEqual(gold_bundle['metadata']['mode'], 'gold')
                self.assertEqual(arm.metadata['mode'], 'gold')
                self.assertTrue(arm.is_loaded)

    @classmethod
    def tearDownClass(cls):
        """Clean up test artifacts to ensure zero pollution of production state."""
        artifacts_dir = os.path.join(os.path.dirname(__file__), 'artifacts')
        for fname in ['svm_model.joblib', 'svm_metadata.json', 'svm_evaluation.json']:
            fpath = os.path.join(artifacts_dir, fname)
            if os.path.exists(fpath):
                try:
                    os.remove(fpath)
                except Exception:
                    pass


if __name__ == '__main__':
    unittest.main()
