"""
FastAPI Server for Python ML Arms (Linear SVM & RoBERTa-base)
Exposes endpoints for dataset synchronization, model training, and inference.
"""

import os
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .split_manager import (
    TAXONOMY_CATEGORIES,
    get_dataset_statistics,
    load_adjudicated_data,
    save_adjudicated_data,
    DEFAULT_DATA_PATH,
    EXPLORATORY_DATA_PATH,
    generate_split_manifests,
    EXPLORATORY_MANIFEST_DIR,
    DATA_DIR
)
from .svm_arm import SvmClassifierArm
from .roberta_arm import RobertaClassifierArm

app = FastAPI(
    title="Customer Requirement Analysis - Python ML Service",
    description="Formal Experimental Arms: Linear SVM (Arm 1) and RoBERTa-base (Arm 2)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate singleton arms
svm_arm = SvmClassifierArm()
roberta_arm = RobertaClassifierArm()


class TextRequest(BaseModel):
    text: str


class SyncDatasetRequest(BaseModel):
    records: List[Dict[str, Any]]
    mode: str = 'gold'


class SplitRequest(BaseModel):
    records: Optional[List[Dict[str, Any]]] = None
    mode: str = 'gold'


def _validate_mode(mode: str) -> str:
    if mode not in ('gold', 'exploratory'):
        raise HTTPException(status_code=400, detail="mode must be 'gold' or 'exploratory'")
    return mode


def _dataset_path(mode: str) -> str:
    return EXPLORATORY_DATA_PATH if mode == 'exploratory' else DEFAULT_DATA_PATH


@app.get("/health")
@app.get("/ml/status")
def get_status(mode: str = Query(default='gold')):
    mode = _validate_mode(mode)
    records = load_adjudicated_data(_dataset_path(mode))
    stats = get_dataset_statistics(records, mode=mode)
    return {
        "status": "ok",
        "service": "python-ml-service",
        "mode": mode,
        "svm_arm": svm_arm.get_status(records, mode=mode),
        "roberta_arm": roberta_arm.get_status(records, mode=mode),
        "dataset_statistics": stats
    }


@app.post("/ml/sync-dataset")
def sync_dataset(req: SyncDatasetRequest):
    mode = _validate_mode(req.mode)
    records = req.records
    save_path = save_adjudicated_data(records, path=_dataset_path(mode))
    stats = get_dataset_statistics(records, mode=mode)
    manifest_dir = DATA_DIR if mode == 'gold' else EXPLORATORY_MANIFEST_DIR
    split_result = generate_split_manifests(records, output_dir=manifest_dir)
    return {
        "success": True,
        "saved_records": len(records),
        "path": save_path,
        "statistics": stats,
        "split_manifests": split_result
    }


@app.post("/ml/splits")
def generate_splits(req: SplitRequest):
    mode = _validate_mode(req.mode)
    records = req.records if req.records is not None else load_adjudicated_data(_dataset_path(mode))
    output_dir = DATA_DIR if mode == 'gold' else EXPLORATORY_MANIFEST_DIR
    return generate_split_manifests(records, output_dir=output_dir)


@app.post("/ml/svm/classify")
def classify_svm(req: TextRequest):
    return svm_arm.classify(req.text)


@app.post("/ml/svm/train")
def train_svm(mode: str = Query(default='gold')):
    mode = _validate_mode(mode)
    records = load_adjudicated_data(_dataset_path(mode))
    result = svm_arm.train(records, mode=mode)
    if not result.get('success'):
        return {"success": False, "status": result.get('status'), "message": result.get('message'), "details": result.get('details')}
    return result


@app.post("/ml/roberta/classify")
def classify_roberta(req: TextRequest):
    return roberta_arm.classify(req.text)


@app.post("/ml/roberta/train")
def train_roberta(mode: str = Query(default='gold')):
    mode = _validate_mode(mode)
    records = load_adjudicated_data(_dataset_path(mode))
    result = roberta_arm.train(records, mode=mode)
    if not result.get('success'):
        return {"success": False, "status": result.get('status'), "message": result.get('message'), "details": result.get('details')}
    return result


@app.post("/ml/classify-all")
def classify_all(req: TextRequest):
    svm_res = svm_arm.classify(req.text)
    roberta_res = roberta_arm.classify(req.text)
    return {
        "svm": svm_res,
        "roberta": roberta_res
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
