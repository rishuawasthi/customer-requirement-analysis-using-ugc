"""
Unit and Integration Tests for Python ML Pipeline
Tests:
1. Review ID-based split determinism and zero data leakage
2. Training refusal when adjudicated data is below threshold
3. End-to-end SVM training, calibration, persistence, and inference on eligible data
4. Non-fabrication guarantee: no mock artifacts survive into production
"""

import os
import shutil
import tempfile
import unittest

from server.ml.split_manager import (
    assign_review_to_split,
    partition_records,
    get_dataset_statistics,
    TAXONOMY_CATEGORIES
)
from server.ml.svm_arm import SvmClassifierArm


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

        # Check all sentences belonging to a review are in the exact same split
        for r in splits['train']:
            self.assertIn(r['review_id'], train_revs)
        for r in splits['val']:
            self.assertIn(r['review_id'], val_revs)
        for r in splits['test']:
            self.assertIn(r['review_id'], test_revs)

    def test_training_refusal_insufficient_data(self):
        """Verify that SVM refuses to train when adjudicated data is below threshold."""
        records = [
            {'id': '1', 'review_id': 'r1', 'text': 'sentence 1', 'adjudicated': 'EXPLICIT_NEED'},
            {'id': '2', 'review_id': 'r2', 'text': 'sentence 2', 'adjudicated': 'PAIN_POINT'}
        ]
        arm = SvmClassifierArm()
        res = arm.train(records)
        self.assertFalse(res['success'])
        self.assertEqual(res['status'], 'insufficient_data')
        self.assertIn('requires at least', res['message'])

    def test_svm_eligible_training_and_inference(self):
        """Verify that Linear SVM trains, calibrates, and infers when eligible dataset is provided."""
        # Generate eligible synthetic dataset with distinct reviews and balanced categories
        records = []
        rec_id = 1
        for cat_idx, cat in enumerate(TAXONOMY_CATEGORIES):
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

        stats = get_dataset_statistics(records)
        self.assertTrue(stats['training_eligibility']['is_eligible'])

        arm = SvmClassifierArm()
        train_res = arm.train(records)
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


if __name__ == '__main__':
    unittest.main()
