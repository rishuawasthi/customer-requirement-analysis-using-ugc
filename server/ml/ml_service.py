"""
FastAPI Server for Python ML Arms (Linear SVM & RoBERTa-base)
Exposes endpoints for dataset synchronization, model training, and inference.
"""

import os
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .split_manager import (
    TAXONOMY_CATEGORIES,
    get_dataset_statistics,
    load_adjudicated_data,
    save_adjudicated_data
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


@app.get("/health")
@app.get("/ml/status")
def get_status():
    records = load_adjudicated_data()
    stats = get_dataset_statistics(records)
    return {
        "status": "ok",
        "service": "python-ml-service",
        "svm_arm": svm_arm.get_status(records),
        "roberta_arm": roberta_arm.get_status(records),
        "dataset_statistics": stats
    }


@app.post("/ml/sync-dataset")
def sync_dataset(req: SyncDatasetRequest):
    records = req.records
    save_path = save_adjudicated_data(records)
    stats = get_dataset_statistics(records)
    return {
        "success": True,
        "saved_records": len(records),
        "path": save_path,
        "statistics": stats
    }


@app.post("/ml/svm/classify")
def classify_svm(req: TextRequest):
    return svm_arm.classify(req.text)


@app.post("/ml/svm/train")
def train_svm():
    records = load_adjudicated_data()
    result = svm_arm.train(records)
    if not result.get('success'):
        return {"success": False, "status": result.get('status'), "message": result.get('message'), "details": result.get('details')}
    return result


@app.post("/ml/roberta/classify")
def classify_roberta(req: TextRequest):
    return roberta_arm.classify(req.text)


@app.post("/ml/roberta/train")
def train_roberta():
    records = load_adjudicated_data()
    result = roberta_arm.train(records)
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
