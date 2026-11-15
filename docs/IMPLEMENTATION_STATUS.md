# Implementation Status Report
**Project:** Customer Requirement Analysis Using User Generated Content  
**Authors:** Rupika Upadhyay, Roshni Singh, Ronak Garg, Rishu Awasthi  
**Institution:** Department of Computer Science and Engineering, ABES Engineering College, Ghaziabad, India  
**Date:** November 2026

---

## 1. Overview of Delivered Enhancements

In accordance with strict academic research integrity, the React + TypeScript application has been enhanced to directly align with the IEEE research manuscript (*"Designing a Benchmark for Classifying Explicit Needs, Implicit Needs, and Pain Points in User-Generated Content"*).

### Delivered Capabilities Matrix:

| Requirement Area | Specification | Implementation Detail | Status |
| :--- | :--- | :--- | :---: |
| **Dataset Switcher** | Dynamic toggle between curated demo set and full benchmark | Supports both the curated 45-record presentation set (`semeval2015_research_ready.csv` / `.xlsx`) and the complete 4,161-row benchmark (`semeval2015_research_ready_full.csv`). Displays total rows, unique reviews, and unique sentences. | **DELIVERED** |
| **Evaluation & Benchmark** | Formal research section matching paper design | Displays RQ1–RQ4, Table V (Dataset & Annotation Stats), Table VI (Model Macro-F1 with `[Pending]` cells), Table VII (10 Planned Error Analysis failure modes), and Machine Learning baseline rationale. | **DELIVERED** |
| **Independent Human Annotation** | Two independent human annotator roles | Dedicated annotation workbench for Annotator A and Annotator B. Labels remain independent and immutable. Real-time agreement/disagreement detection with separate Adjudication role and notes. | **DELIVERED** |
| **Krippendorff's Alpha** | Nominal inter-coder reliability metric | Computed strictly across dual human annotations ($m=2$). Excludes heuristic predictions and adjudicated labels. Features standard interpretation thresholds ($\ge 0.80$ reliable, $0.67 \le \alpha < 0.80$ tentative). | **DELIVERED** |
| **SemEval Domain Comparison** | Descriptive analysis across available corpus | Rigorous comparison between Laptop (Product, 2,314 rows) and Restaurant (Service, 1,847 rows). Clearly disclaims that this does not complete the pending Amazon-to-AWARE study. | **DELIVERED** |
| **ML Baseline Policy** | Supervised SVM training conditions | Fully documents why SVM training is withheld: avoids training on sentiment polarity or circular regex pseudo-labels; awaits genuine human gold-standard data. | **DELIVERED** |
| **Research Honesty** | Distinction between predictions and gold standard | All automated counts are explicitly labeled as "Rule-Based Heuristic Predictions", not human ground truth. | **DELIVERED** |

---

## 2. Dataset Profiling & Verification Statistics

Automated verification was conducted across all dataset files in the workspace:

### A. Curated Presentation Set (`semeval2015_research_ready.csv` / `.xlsx`)
- **Total Rows:** 45 records
- **Unique IDs:** 45 (25 Laptop: `LAP_001`–`LAP_025`; 20 Restaurant: `REST_001`–`REST_020`)
- **Heuristic Distribution:**
  - `NON_ACTIONABLE`: 13 (28.9%)
  - `PAIN_POINT`: 12 (26.7%)
  - `EXPLICIT_NEED`: 11 (24.4%)
  - `IMPLICIT_NEED`: 9 (20.0%)
- **Original ABSA Polarity:** Negative: 24, Neutral: 13, Positive: 8
- **Role:** Default presentation dataset for fast, predictable viva demonstration.

### B. Full SemEval-2015 Benchmark (`semeval2015_research_ready_full.csv`)
- **Total Rows:** 4,161 rows
- **Unique Review IDs:** 531 distinct reviews
- **Unique Sentence IDs / Units:** 3,054 units
- **Unique Sentence Text:** 3,049 units
- **Domain Breakdown:**
  - Laptop: 2,314 rows
  - Restaurant: 1,847 rows
- **Original ABSA Polarity:** Positive: 2,300, Negative: 1,167, Neutral: 159, Unannotated: 535
- **Role:** Full benchmark corpus for evaluating real-world review scale.

---

## 3. Files Modified and Created

1. **`src/types/index.ts`**
   - Added `HumanAnnotations`, `AgreementStats`, `DatasetOption`, and extended `FeedbackRecord` with `reviewId`, `sentenceId`, `domain`, and `humanAnnotations`.
2. **`src/utils/krippendorff.ts`** (NEW)
   - Implements nominal Krippendorff's alpha for dual coders. Strictly evaluates independent human annotator pairs.
3. **`src/utils/fileParser.ts`**
   - Preserves `review_id`, `sentence_id`, `domain`, `category`, `polarity`, `target`. Calculates unique review and sentence counts.
4. **`src/utils/exportCsv.ts`**
   - Exports all records including Annotator A, Annotator B, inter-annotator agreement status, and adjudicated gold labels.
5. **`src/components/Navbar.tsx`**
   - Added tabs for `Human Annotation & Alpha` and `Evaluation & Benchmark`. Added dynamic count badges.
6. **`src/components/OverviewSection.tsx`**
   - Displays row counts, unique review/sentence counts, human-annotated counts, and explicit heuristic baseline labeling.
7. **`src/components/DatasetSection.tsx`**
   - Implemented dynamic Dataset Switcher with options for Curated 45-Set, Full 4,161 Benchmark, and Custom Upload.
8. **`src/components/HumanAnnotationSection.tsx`** (NEW)
   - Dual-annotator workspace, agreement/disagreement indicator, adjudication panel, live Krippendorff's alpha scorecard, and CSV export.
9. **`src/components/EvaluationBenchmarkSection.tsx`** (NEW)
   - Displays RQ1–RQ4, Table V, Table VI with pending values, Table VII error taxonomy, and domain comparison.
10. **`src/App.tsx`**
    - Connects all sections, maintains state across dataset switches, and manages annotation persistence.

---

## 4. Verification Tests Executed

| Test Step | Command / Method | Result | Notes |
| :--- | :--- | :---: | :--- |
| **TypeScript Compilation** | `npm run lint` (`tsc --noEmit`) | **PASS (0 errors)** | Full type safety across all interfaces and components. |
| **Vite Production Build** | `npm run build` | **PASS (1.28s)** | Production bundle generated in `dist/`. |
| **Dataset Loading Check** | Python / API validation | **PASS** | Successfully verified 45 rows in curated set and 4,161 rows in full set. |
| **Nominal Alpha Formula Check** | Unit test matrix | **PASS** | Validated perfect agreement ($\alpha = 1.0$), partial agreement, and insufficient data guard. |
| **CSV Export Formatting** | RFC-4180 validation | **PASS** | Validated UTF-8 BOM, escaped quotes, and annotation columns. |
