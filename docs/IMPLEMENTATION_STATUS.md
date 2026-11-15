# Implementation Status Report
**Project:** Customer Requirement Analysis Using User Generated Content  
**Authors:** Rupika Upadhyay, Roshni Singh, Ronak Garg, Rishu Awasthi  
**Supervisor:** Mr. Praveen Kumar Rai  
**Institution:** Department of Computer Science and Engineering, ABES Engineering College, Ghaziabad, India  
**Date:** November 2026 (Phase 1, Phase 2 & Phase 3 ML Pipeline Complete)

---

## 1. Executive Summary

The project has implemented, audited, and verified a machine learning training and evaluation pipeline for customer requirement analysis in user-generated content. All implementations strictly adhere to the academic research manuscript (*"Designing a Benchmark for Classifying Explicit Needs, Implicit Needs, and Pain Points in User-Generated Content"*).

The system enforces strict academic non-fabrication guarantees:
- **Mode A (Formal Benchmark):** Human gold adjudicated labels only. Training is safely blocked when human labels fall below threshold ($\ge 4$ examples/class, 16 total).
- **Mode B (Exploratory Weak Supervision):** Syntactic rule-based weak labels partitioned deterministically by `review_id` to benchmark pipeline mechanics, 95% bootstrap confidence intervals, and 4x4 confusion matrices without corrupting the formal human gold benchmark.

---

## 2. Complete Model Arm Architecture

| Model Arm | Specification | Training Data | Hardware / Runtime | Benchmark Status |
| :--- | :--- | :--- | :--- | :---: |
| **Statistical Baseline** | Majority-Class Floor | 70% Training Partition | Analytical | **IMPLEMENTED** (Macro-F1: 0.089) |
| **Rule-Based Heuristic** | Contextual Syntactic Regex (Boundary Precedence) | None (Zero Training) | In-Memory / Client | **ACTIVE BASELINE** (Macro-F1: 0.782) |
| **Model Arm 1: Linear SVM** | Sublinear TF-IDF (1-2 ngrams) + `LinearSVC(class_weight='balanced')` | Review Split (70/15/15) | Python Scikit-Learn | **TRAINED & EVALUATED (Mode B)** / **AWAITING DATA (Mode A)** |
| **Model Arm 2: RoBERTa-base** | 4-way Sequence Classification over `[CLS]` pooled representation | Review Split (70/15/15) | PyTorch / Transformers (CPU Fallback, RTX 3050 auto-detect) | **IMPLEMENTED** (Offline Weights Guarded) |
| **Model Arm 3: Gemini Zero-Shot ($k=0$)** | Direct instruction prompting | None | Google GenAI SDK (`gemini-2.5-flash`) | **ACTIVE IN PIPELINE** |
| **Model Arm 3: Gemini Few-Shot ($k=2, 4, 8$)** | Exemplars drawn strictly from training split ($k$ per class: 8, 16, 32 total) | Training partition only | Google GenAI SDK (`gemini-2.5-flash`) | **ACTIVE IN PIPELINE** |

---

## 3. Evaluation & Mathematical Rigor

1. **Review-Level Partitioning & Zero Leakage:**
   - 70% Train, 15% Validation, 15% Test based on salted cryptographic hashing of `review_id` (seed=42).
   - Zero intra-review lexical leakage verified: $\text{Train} \cap \text{Val} = \emptyset$, $\text{Train} \cap \text{Test} = \emptyset$, $\text{Val} \cap \text{Test} = \emptyset$.
   - Manifest files generated: `train_manifest.json`, `val_manifest.json`, `test_manifest.json`.

2. **Metrics & Bootstrap Confidence Interval:**
   - Primary metric: Macro-F1 (unweighted arithmetic mean across 4 categories).
   - Secondary metrics: Accuracy, Weighted-F1, per-class Precision, Recall, F1, and Support.
   - Non-parametric 95% bootstrap confidence interval (1,000 iterations, seed=42) with percentile bounds $[2.5\%, 97.5\%]$.

3. **4×4 Confusion Matrix & Boundary Analysis:**
   - Full $4 \times 4$ categorical confusion matrix (raw counts and row-normalized percentages).
   - Specialized diagnostic detection of the critical manuscript boundary: **Implicit Need vs. Pain Point** and **Explicit Need vs. Implicit Need**.

---

## 4. Test Verification Suite

| Test Suite | File | Checks | Result |
| :--- | :--- | :---: | :---: |
| **Few-Shot Prompt Integrity** | `server/test-prompts.mjs` | 11 Checks ($k=0, 2, 4, 8$, self-leakage, monotonicity) | **PASS** |
| **Python ML Pipeline** | `server/ml/test_ml_pipeline.py` | 6 Checks (split determinism, training refusal, SVM fit, CI, confusion) | **PASS** |
| **Express ML Bridge** | `server/test-ml-endpoints.mjs` | 6 Checks (status, classification, multi-model, training refusal, sync) | **PASS** |
| **Krippendorff's Alpha** | `server/test-krippendorff.ts` | 4 Checks (perfect agreement, disagreement, missing data, single pair) | **PASS** |
| **Dataset Switching & Export** | `server/test-dataset-export.ts` | 3 Checks (curated 45-set, full 4,161 benchmark, multi-model CSV export) | **PASS** |
| **TypeScript Typecheck** | `npm run lint` | Full codebase static type analysis | **PASS (0 errors)** |
| **Production Build** | `npm run build` | Vite 8 + Rollup production bundle | **PASS (1.57s)** |
