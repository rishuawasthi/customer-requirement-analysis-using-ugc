"""
Command-Line Interface for Python ML Service
Enables Express backend or automated test scripts to invoke ML functionality
synchronously or asynchronously without requiring an external HTTP daemon.
"""

import sys
import json
import argparse
from typing import Dict, Any

from .split_manager import (
    get_dataset_statistics,
    load_adjudicated_data,
    save_adjudicated_data,
    generate_split_manifests,
    load_manifest,
    DEFAULT_DATA_PATH,
    EXPLORATORY_DATA_PATH,
    EXPLORATORY_MANIFEST_DIR,
    DATA_DIR
)
from .svm_arm import SvmClassifierArm
from .roberta_arm import RobertaClassifierArm
from .evaluation import calculate_metrics, bootstrap_macro_f1_ci, compute_confusion_matrix_data


def main():
    parser = argparse.ArgumentParser(description="Academic ML Service CLI")
    parser.add_argument(
        "--action",
        required=True,
        choices=[
            "status",
            "split",
            "sync",
            "classify-svm",
            "classify-roberta",
            "classify-all",
            "train-svm",
            "train-roberta",
            "evaluate"
        ]
    )
    parser.add_argument("--text", default="", help="Input feedback text for classification")
    parser.add_argument("--data-file", default="", help="Path to JSON records file for sync or training")
    parser.add_argument("--mode", default="gold", choices=["gold", "exploratory"], help="Evaluation/training mode")
    args = parser.parse_args()

    svm_arm = SvmClassifierArm()
    roberta_arm = RobertaClassifierArm()

    dataset_path = args.data_file or (EXPLORATORY_DATA_PATH if args.mode == 'exploratory' else DEFAULT_DATA_PATH)

    if args.action == "status":
        gold_records = load_adjudicated_data(args.data_file or DEFAULT_DATA_PATH)
        exploratory_records = load_adjudicated_data(
            args.data_file if args.data_file else EXPLORATORY_DATA_PATH
        )
        records = exploratory_records if args.mode == 'exploratory' else gold_records
        stats_gold = get_dataset_statistics(gold_records, mode='gold')
        stats_exploratory = get_dataset_statistics(exploratory_records, mode='exploratory')
        output = {
            "status": "ok",
            "mode": args.mode,
            "svm_arm": svm_arm.get_status(records, mode=args.mode),
            "roberta_arm": roberta_arm.get_status(records, mode=args.mode),
            "dataset_statistics": {
                "gold": stats_gold,
                "exploratory": stats_exploratory
            }
        }
        print(json.dumps(output, indent=2))

    elif args.action == "split":
        records = load_adjudicated_data(dataset_path)
        manifest_dir = DATA_DIR if args.mode == 'gold' else EXPLORATORY_MANIFEST_DIR
        result = generate_split_manifests(records, output_dir=manifest_dir)
        print(json.dumps(result, indent=2))

    elif args.action == "sync":
        if not args.data_file:
            payload = json.load(sys.stdin)
            records = payload.get("records", [])
        else:
            with open(args.data_file, 'r', encoding='utf-8') as f:
                records = json.load(f)

        save_target = EXPLORATORY_DATA_PATH if args.mode == 'exploratory' else DEFAULT_DATA_PATH
        save_path = save_adjudicated_data(records, path=save_target)
        stats = get_dataset_statistics(records, mode=args.mode)
        manifest_dir = DATA_DIR if args.mode == 'gold' else EXPLORATORY_MANIFEST_DIR
        split_res = generate_split_manifests(records, output_dir=manifest_dir)
        output = {
            "success": True,
            "saved_records": len(records),
            "path": save_path,
            "statistics": stats,
            "split_manifests": split_res
        }
        print(json.dumps(output, indent=2))

    elif args.action == "classify-svm":
        res = svm_arm.classify(args.text)
        print(json.dumps(res, indent=2))

    elif args.action == "classify-roberta":
        res = roberta_arm.classify(args.text)
        print(json.dumps(res, indent=2))

    elif args.action == "classify-all":
        res_svm = svm_arm.classify(args.text)
        res_roberta = roberta_arm.classify(args.text)
        output = {
            "svm": res_svm,
            "roberta": res_roberta
        }
        print(json.dumps(output, indent=2))

    elif args.action == "train-svm":
        records = load_adjudicated_data(dataset_path)
        res = svm_arm.train(records, mode=args.mode)
        print(json.dumps(res, indent=2))

    elif args.action == "train-roberta":
        records = load_adjudicated_data(dataset_path)
        res = roberta_arm.train(records, mode=args.mode)
        print(json.dumps(res, indent=2))

    elif args.action == "evaluate":
        test_records = load_manifest("test", mode=args.mode)
        output = {
            "mode": args.mode,
            "test_sample_count": len(test_records),
            "svm": svm_arm.get_status(
                load_adjudicated_data(dataset_path), mode=args.mode
            ).get("evaluation"),
            "roberta": roberta_arm.get_status(
                load_adjudicated_data(dataset_path), mode=args.mode
            ).get("evaluation")
        }
        print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
