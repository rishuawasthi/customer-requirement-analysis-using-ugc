# Implementation Status Report
**Project:** Customer Requirement Analysis Using User Generated Content  
**Authors:** Rupika Upadhyay, Roshni Singh, Ronak Garg, Rishu Awasthi  
**Institution:** Department of Computer Science and Engineering, ABES Engineering College, Ghaziabad, India  
**Date:** November 2026 (Phase 1 & Phase 2 Complete)

---

## 1. Executive Summary

The project has completed both **Phase 1 (Git Review, Repository Setup, Dataset Licensing & Push)** and **Phase 2 (Google Gemini AI Integration with Dual-Dimensional Classification & Multi-Model Comparative Architecture)**.

All implementations strictly adhere to the academic research manuscript (*"Designing a Benchmark for Classifying Explicit Needs, Implicit Needs, and Pain Points in User-Generated Content"*).

---

## 2. Capability Implementation Matrix

| Architecture Component | Implementation Details | Academic Integrity Verification | Status |
| :--- | :--- | :--- | :---: |
| **Backend API Server** | Node.js Express server (`server/server.js`) on port 5000. Provides `/api/health`, `/api/classify`, and `/api/batch-classify`. | API key resides strictly in `server/.env`. Excluded from Git tracking via `.gitignore`. Never exposed to frontend bundles. | **VERIFIED** |
| **Google GenAI SDK** | Official `@google/genai` SDK with `gemini-2.5-flash` model. | Low temperature (0.1) for determinism. Uses `responseMimeType: "application/json"` and `responseJsonSchema`. | **VERIFIED** |
| **Two-Dimensional Classification** | Predicts **Sentiment Polarity** (`POSITIVE`, `NEGATIVE`, `NEUTRAL`, `MIXED`) and **Customer Requirement Taxonomy** (`EXPLICIT_NEED`, `IMPLICIT_NEED`, `PAIN_POINT`, `NON_ACTIONABLE`) in one request. | Evaluates sentiment and requirement independently. Direct requests override negative sentiment. | **VERIFIED** |
| **Controlled Benchmark Prompts** | Dedicated versioned prompt module (`server/prompts.js`, v1.0-research). Supports $k \in \{0, 2, 4, 8\}$ few-shot exemplars. | Exemplars drawn strictly from verified training split. Zero test-set leakage. | **VERIFIED** |
| **Heuristic Baseline Preservation** | Transparent rule-based regex baseline (`src/utils/classifier.ts`) kept fully operational. | Clearly presented as "Rule-Based Heuristic Baseline", not machine learning. | **VERIFIED** |
| **Multi-Model Comparison in UI** | Side-by-side comparison in `FeedbackAnalysisSection.tsx` for individual sentences and custom feedback tester. | Allows comparing baseline regex vs Gemini AI output on identical sentences. | **VERIFIED** |
| **Controlled Batch Inference** | Throttled concurrency (max 3-5 workers) with retry backoff and cancellation support. | Prevents rate-limit exhaustion. In-memory client caching by sentence text and config. | **VERIFIED** |
| **Independent Human Annotation** | Two independent annotator roles (Annotator A vs B) + Adjudication role. | Nominal Krippendorff's alpha computed strictly across dual human labels. Model predictions excluded. | **VERIFIED** |
| **Dataset Switcher** | Instant toggle between Curated 45-set and Full 4,161 SemEval benchmark. | Preserves all original columns, review IDs, sentence IDs, domains, and ABSA polarity. | **VERIFIED** |
| **Research Benchmark Page** | Displays RQ1–RQ4, Table V, Table VI, Table VII, and SVM status statement. | Benchmark Macro-F1 scores retained as `[Pending Gold Annotation]`. No invented empirical values. | **VERIFIED** |

---

## 3. Dataset Profiling Statistics

- **Curated Presentation Dataset (`semeval2015_research_ready.csv` / `.xlsx`):**
  - Total records: 45 (25 Laptop, 20 Restaurant)
  - Balanced across categories: 13 Non-Actionable, 12 Pain Point, 11 Explicit Need, 9 Implicit Need
  - Role: Fast, deterministic viva demonstration
- **Full SemEval-2015 Benchmark (`semeval2015_research_ready_full.csv`):**
  - Total rows: 4,161
  - Unique reviews: 531
  - Unique sentence units: 3,054
  - Domains: Laptop (2,314 rows), Restaurant (1,847 rows)
  - Role: Full-scale corpus evaluation

---

## 4. Verification Tests Executed

| Test Step | Target | Method | Result |
| :--- | :--- | :--- | :---: |
| **TypeScript Typecheck** | Frontend & Types | `npm run lint` (`tsc --noEmit`) | **PASS (0 errors)** |
| **Production Build** | Frontend Bundle | `npm run build` (`vite build`) | **PASS (1.05s)** |
| **Prompt Builder Test** | `server/prompts.js` | Evaluated $k=0, 2, 4, 8$ exemplars and boundary rules | **PASS** |
| **Backend Health Endpoint** | `GET /api/health` | Probed on `http://127.0.0.1:5000/api/health` | **PASS (200 OK)** |
| **Empty Input Handling** | `POST /api/classify` | Sent empty string payload `{ text: "" }` | **PASS (400 INVALID_INPUT)** |
| **Missing API Key Handling** | `POST /api/classify` | Sent request without active API key | **PASS (503 MISSING_API_KEY)** |
| **Empty Batch Handling** | `POST /api/batch-classify` | Sent empty batch payload `{ items: [] }` | **PASS (400 INVALID_BATCH)** |
| **Alpha Mathematical Engine** | `src/utils/krippendorff.ts` | Validated nominal agreement formula on dual coders | **PASS** |
| **RFC-4180 CSV Export** | `src/utils/exportCsv.ts` | Validated separate columns for Heuristic, Gemini, and Human labels | **PASS** |
