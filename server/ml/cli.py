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
    save_adjudicated_data
)
from .svm_arm import SvmClassifierArm
from .roberta_arm import RobertaClassifierArm


def main():
    parser = argparse.ArgumentParser(description="Academic ML Service CLI")
    parser.add_argument("--action", required=True, choices=["status", "sync", "classify-svm", "classify-roberta", "classify-all", "train-svm", "train-roberta"])
    parser.add_argument("--text", default="", help="Input feedback text for classification")
    parser.add_argument("--data-file", default="", help="Path to JSON records file for sync or training")
    args = parser.parse_args()

    svm_arm = SvmClassifierArm()
    roberta_arm = RobertaClassifierArm()

    if args.action == "status":
        records = load_adjudicated_data(args.data_file or None)
        stats = get_dataset_statistics(records)
        output = {
            "status": "ok",
            "svm_arm": svm_arm.get_status(records),
            "roberta_arm": roberta_arm.get_status(records),
            "dataset_statistics": stats
        }
        print(json.dumps(output, indent=2))

    elif args.action == "sync":
        if not args.data_file:
            # Read from stdin
            payload = json.load(sys.stdin)
            records = payload.get("records", [])
        else:
            with open(args.data_file, 'r', encoding='utf-8') as f:
                records = json.load(f)

        save_path = save_adjudicated_data(records)
        stats = get_dataset_statistics(records)
        output = {
            "success": True,
            "saved_records": len(records),
            "path": save_path,
            "statistics": stats
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
        records = load_adjudicated_data(args.data_file or None)
        res = svm_arm.train(records)
        print(json.dumps(res, indent=2))

    elif args.action == "train-roberta":
        records = load_adjudicated_data(args.data_file or None)
        res = roberta_arm.train(records)
        print(json.dumps(res, indent=2))


if __name__ == "__main__":
    main()
