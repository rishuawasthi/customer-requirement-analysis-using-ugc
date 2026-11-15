"""
Academic Split Manager for Customer Requirement Analysis
Ensures review_id-based group splitting, prevents intra-review data leakage,
generates split manifest files, and enforces dataset eligibility requirements for supervised model arms.
"""

import os
import json
import hashlib
from typing import Dict, List, Any, Tuple, Optional
from collections import Counter

TAXONOMY_CATEGORIES = ['EXPLICIT_NEED', 'IMPLICIT_NEED', 'PAIN_POINT', 'NON_ACTIONABLE']
MIN_RECORDS_PER_CLASS = 4  # Minimum required adjudicated training records per category to enable training
SPLIT_RATIOS = {'train': 0.70, 'val': 0.15, 'test': 0.15}
RANDOM_SEED = 42

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
DEFAULT_DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'adjudicated_dataset.json')
EXPLORATORY_DATA_PATH = os.path.join(DATA_DIR, 'ai_exploratory_dataset.json')
EXPLORATORY_MANIFEST_DIR = os.path.join(DATA_DIR, 'exploratory')

TRAIN_MANIFEST_PATH = os.path.join(DATA_DIR, 'train_manifest.json')
VAL_MANIFEST_PATH = os.path.join(DATA_DIR, 'val_manifest.json')
TEST_MANIFEST_PATH = os.path.join(DATA_DIR, 'test_manifest.json')


def assign_review_to_split(review_id: str, seed: int = RANDOM_SEED) -> str:
    """
    Deterministically assigns a review_id to 'train', 'val', or 'test' split
    using a salted cryptographic hash. This guarantees strict reproducibility
    and zero leakage even as new reviews are incrementally added.
    """
    clean_id = str(review_id).strip()
    salted = f"{clean_id}_{seed}"
    hash_val = int(hashlib.md5(salted.encode('utf-8')).hexdigest(), 16) % 10000 / 10000.0

    if hash_val < SPLIT_RATIOS['train']:
        return 'train'
    elif hash_val < (SPLIT_RATIOS['train'] + SPLIT_RATIOS['val']):
        return 'val'
    else:
        return 'test'


def partition_records(records: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """
    Partitions a list of feedback records into train, val, and test splits
    based strictly on review_id. Sentences without review_id fall back to id.
    """
    splits = {'train': [], 'val': [], 'test': []}

    for idx, r in enumerate(records):
        rev_id = r.get('reviewId') or r.get('review_id') or r.get('id') or f"REC_{idx}"
        split = assign_review_to_split(rev_id)
        splits[split].append(r)

    return splits


def verify_zero_leakage(splits: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
    """
    Verifies that no review_id appears in more than one partition.
    Returns status and overlap sets.
    """
    train_revs = set(r.get('reviewId') or r.get('review_id') or r.get('id') for r in splits['train'])
    val_revs = set(r.get('reviewId') or r.get('review_id') or r.get('id') for r in splits['val'])
    test_revs = set(r.get('reviewId') or r.get('review_id') or r.get('id') for r in splits['test'])

    train_val_overlap = train_revs.intersection(val_revs)
    train_test_overlap = train_revs.intersection(test_revs)
    val_test_overlap = val_revs.intersection(test_revs)

    is_clean = len(train_val_overlap) == 0 and len(train_test_overlap) == 0 and len(val_test_overlap) == 0

    return {
        'zero_leakage': is_clean,
        'train_unique_reviews': len(train_revs),
        'val_unique_reviews': len(val_revs),
        'test_unique_reviews': len(test_revs),
        'overlaps': {
            'train_val': list(train_val_overlap),
            'train_test': list(train_test_overlap),
            'val_test': list(val_test_overlap)
        }
    }


def generate_split_manifests(
    records: List[Dict[str, Any]],
    output_dir: Optional[str] = None
) -> Dict[str, Any]:
    """
    Partitions the given dataset by review_id and writes out manifest files
    for train, val, and test partitions, alongside leakage verification.
    """
    target_dir = output_dir or DATA_DIR
    os.makedirs(target_dir, exist_ok=True)

    splits = partition_records(records)
    leakage_check = verify_zero_leakage(splits)

    manifest_paths = {
        'train': os.path.join(target_dir, 'train_manifest.json'),
        'val': os.path.join(target_dir, 'val_manifest.json'),
        'test': os.path.join(target_dir, 'test_manifest.json')
    }

    for split_name, file_path in manifest_paths.items():
        split_records = splits[split_name]
        manifest_data = {
            'split': split_name,
            'count': len(split_records),
            'records': split_records
        }
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(manifest_data, f, indent=2, ensure_ascii=False)

    return {
        'success': True,
        'manifest_paths': manifest_paths,
        'counts': {k: len(v) for k, v in splits.items()},
        'leakage_verification': leakage_check
    }


def get_dataset_statistics(records: List[Dict[str, Any]], mode: str = 'gold') -> Dict[str, Any]:
    """
    Audits the current dataset and reports counts, adjudicated labels,
    class distribution per split, and eligibility for supervised training.
    mode='gold': considers only human-adjudicated labels.
    mode='exploratory': considers weak/exploratory labels.
    """
    total = len(records)
    adjudicated_records = []
    annotated_records = []

    for r in records:
        ha = r.get('humanAnnotations') or {}
        # Dual annotation means both independent human coder fields are present.
        if ha.get('annotatorA') and ha.get('annotatorB'):
            annotated_records.append(r)

        label = None
        if mode == 'gold':
            adj = ha.get('adjudicated') or r.get('adjudicated')
            if adj and adj in TAXONOMY_CATEGORIES:
                label = adj
        else:
            # Exploratory mode: accept predictedCategory or exploratoryLabel or adjudicated
            label = r.get('exploratoryLabel') or r.get('predictedCategory') or ha.get('adjudicated') or r.get('adjudicated')
            if label not in TAXONOMY_CATEGORIES:
                label = None

        clean_text = str(r.get('text') or '').strip()
        if label and clean_text:
            adjudicated_records.append({
                'id': r.get('id'),
                'text': clean_text,
                'review_id': r.get('reviewId') or r.get('review_id') or r.get('id'),
                'label': label
            })

    splits = partition_records(adjudicated_records)

    train_counts = Counter(r['label'] for r in splits['train'])
    val_counts = Counter(r['label'] for r in splits['val'])
    test_counts = Counter(r['label'] for r in splits['test'])

    # Check eligibility: each of the 4 classes must have >= MIN_RECORDS_PER_CLASS in the train split
    is_eligible = True
    missing_by_class = {}
    for cat in TAXONOMY_CATEGORIES:
        count = train_counts.get(cat, 0)
        needed = max(0, MIN_RECORDS_PER_CLASS - count)
        missing_by_class[cat] = {
            'train_count': count,
            'required': MIN_RECORDS_PER_CLASS,
            'missing': needed
        }
        if count < MIN_RECORDS_PER_CLASS:
            is_eligible = False

    return {
        'mode': mode,
        'total_records': total,
        'dual_annotated_count': len(annotated_records),
        'labelled_count': len(adjudicated_records),
        'splits': {
            'train': {
                'total': len(splits['train']),
                'unique_reviews': len(set(r['review_id'] for r in splits['train'])),
                'class_distribution': dict(train_counts)
            },
            'val': {
                'total': len(splits['val']),
                'unique_reviews': len(set(r['review_id'] for r in splits['val'])),
                'class_distribution': dict(val_counts)
            },
            'test': {
                'total': len(splits['test']),
                'unique_reviews': len(set(r['review_id'] for r in splits['test'])),
                'class_distribution': dict(test_counts)
            }
        },
        'training_eligibility': {
            'is_eligible': is_eligible,
            'min_records_per_class': MIN_RECORDS_PER_CLASS,
            'min_total_train': MIN_RECORDS_PER_CLASS * len(TAXONOMY_CATEGORIES),
            'current_train_total': len(splits['train']),
            'per_class_status': missing_by_class
        }
    }


def load_adjudicated_data(path: Optional[str] = None) -> List[Dict[str, Any]]:
    """Loads adjudicated dataset from json file if it exists."""
    target_path = path or DEFAULT_DATA_PATH
    if os.path.exists(target_path):
        try:
            with open(target_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []
    return []


def save_adjudicated_data(records: List[Dict[str, Any]], path: Optional[str] = None) -> str:
    """Saves adjudicated dataset to target json file."""
    target_path = path or DEFAULT_DATA_PATH
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    with open(target_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=2, ensure_ascii=False)
    return target_path


def load_manifest(split: str, target_dir: Optional[str] = None, mode: str = 'gold') -> List[Dict[str, Any]]:
    """Loads records for a specific partition manifest ('train', 'val', or 'test')."""
    if mode not in ('gold', 'exploratory'):
        raise ValueError("mode must be 'gold' or 'exploratory'")
    dir_path = target_dir or (DATA_DIR if mode == 'gold' else EXPLORATORY_MANIFEST_DIR)
    manifest_file = os.path.join(dir_path, f"{split}_manifest.json")
    if os.path.exists(manifest_file):
        try:
            with open(manifest_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get('records', [])
        except Exception:
            return []
    return []
