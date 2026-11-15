# Customer Requirement Analysis Using User Generated Content
**Academic Research Project & Multi-Model Prototype**  
**Authors:** Rupika Upadhyay, Roshni Singh, Ronak Garg, Rishu Awasthi (Department of CSE, ABES Engineering College)  
**Supervisor:** Mr. Praveen Kumar Rai | **Course:** BCS554 (5th Sem Mini Project)  
**Repository:** [https://github.com/rishuawasthi/customer-requirement-analysis-using-ugc.git](https://github.com/rishuawasthi/customer-requirement-analysis-using-ugc.git)

---

## 1. Project Overview & Research Problem

In software development and product management, user reviews and feedback submissions provide an indispensable stream of real-world user sentiment. However, traditional sentiment analysis only produces polarity scores (*positive*, *negative*, *neutral*), which fails to answer the critical question engineering teams face: **What specific changes, features, or fixes do customers want?**

This project bridges that gap by operationalizing a **Four-Class Customer Requirement Taxonomy**:

| Category | Operational Definition | Prototypical Example |
| :--- | :--- | :--- |
| **`EXPLICIT_NEED`** | Customer directly requests, wants, or commands a specific feature, change, or fix. | *"Please add an option to export reports as PDF."* |
| **`IMPLICIT_NEED`** | A desired improvement can be inferred from a described friction or workaround, without a direct request. | *"I have to screenshot every transaction because there is no way to save history."* |
| **`PAIN_POINT`** | Dissatisfaction or an acute crash/failure with no clearly inferable desired feature. | *"The checkout process is extremely frustrating and crashes."* |
| **`NON_ACTIONABLE`** | General praise, rating restatement, or subjective commentary with no actionable requirement signal. | *"Great app, five stars."* |

---

## 2. Multi-Model Architecture

The application supports a rigorous comparative evaluation between two distinct model families:

```
                                  +-------------------------------------------------------------+
                                  |                 User-Generated Content (UGC)                |
                                  |         (SemEval-2015 Laptop & Restaurant Review Corpus)     |
                                  +------------------------------+------------------------------+
                                                                 |
                                       +-------------------------+-------------------------+
                                       |                                                   |
                                       v                                                   v
                         [Rule-Based Heuristic Baseline]                         [Google Gemini AI Classifier]
                         - Deterministic Regex Engine                            - Official @google/genai SDK
                         - Lexical cues & modal verbs                            - Backend Node.js Express API
                         - Fully interpretable rationale                         - Two-dimensional structured output:
                         - Zero hallucinations                                     * Sentiment (Pos/Neg/Neu/Mix)
                                                                                   * Requirement Category
                                                                                   * Verbatim Evidence
                                                                                   * Model Confidence
                                                                 |
                                       +-------------------------+-------------------------+
                                       |
                                       v
                         [Independent Human Annotation & Reliability]
                         - Independent Annotator A & Annotator B roles
                         - Third-pass Adjudication of disagreements
                         - Live Nominal Krippendorff's Alpha (α)
                         - Strict isolation: Predictions are never treated as ground truth
```

1. **Rule-Based Heuristic Baseline:** A transparent, deterministic linguistic pattern matching engine (`src/utils/classifier.ts`). Inspects imperative directives, counterfactual wishes, and defect terms.
2. **Google Gemini AI Classifier:** Official `@google/genai` SDK integrated via a secure backend Node.js Express API (`server/server.js`). Classifies both **Sentiment Polarity** and **Customer Requirement Taxonomy** in a single structured JSON request.

---

## 3. Two-Dimensional Structured Output Specification

Gemini produces structured JSON adhering to the OpenAPI schema:

```json
{
  "sentiment": "NEGATIVE",
  "requirement_category": "EXPLICIT_NEED",
  "evidence": "Please provide Linux compatible drivers.",
  "explanation": "Customer issues a direct imperative request for Linux driver support.",
  "confidence": 0.96
}
```

- **Sentiment Dimension:** `POSITIVE`, `NEGATIVE`, `NEUTRAL`, `MIXED`
- **Requirement Dimension:** `EXPLICIT_NEED`, `IMPLICIT_NEED`, `PAIN_POINT`, `NON_ACTIONABLE`
- **Boundary Rules Enforced:**
  - Direct request $\rightarrow$ `EXPLICIT_NEED` (even if sentiment is strongly negative).
  - Friction/workaround implying specific improvement $\rightarrow$ `IMPLICIT_NEED`.
  - Acute failure without inferable feature $\rightarrow$ `PAIN_POINT`.
  - Generic praise or commentary $\rightarrow$ `NON_ACTIONABLE`.
- **Independence:** Sentiment and requirement category are evaluated independently.
- **Confidence Disclosure:** Confidence is model-reported token certainty, not statistically calibrated certainty.

---

## 4. Benchmark Configurations ($k \in \{0, 2, 4, 8\}$)

Controlled prompt regimes configured in `server/prompts.js`:
- **$k=0$ (Zero-Shot):** System instruction with operational boundary definitions only.
- **$k=2$ (Few-Shot):** Balanced exemplars (2 per category) drawn exclusively from the training split.
- **$k=4$ (Few-Shot):** 4 balanced training exemplars per category.
- **$k=8$ (Few-Shot):** 8 balanced training exemplars per category.
- **Leakage Prevention:** Zero evaluation or test-split sentences are included in few-shot demonstrations.

---

## 5. Quickstart & Installation (Windows PowerShell)

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### Step 1: Install Dependencies
```powershell
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to create your local `.env`:
```powershell
Copy-Item .env.example .env
```
Edit `.env` to set your Google Gemini API key:
```env
GEMINI_API_KEY="YOUR_ACTUAL_API_KEY_HERE"
GEMINI_MODEL="gemini-2.5-flash"
PORT=5000
```
> **Security Notice:** The `.env` file is excluded from Git tracking via `.gitignore`. The API key is only read by the backend server and is never bundled in frontend code or transmitted to the browser.

### Step 3: Launch Backend API Server
In a terminal, start the Express backend:
```powershell
npm run server
```
Server starts on `http://localhost:5000`.

### Step 4: Launch Frontend Application
In a separate terminal, start the Vite development server:
```powershell
npm run dev
```
Open your browser at `http://localhost:3000`.

---

## 6. Backend API Specification

| Method | Endpoint | Description | Request Body | Response |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Status and Gemini configuration check | None | `{ status: "ok", geminiConfigured: true, model: "gemini-2.5-flash", port: 5000 }` |
| `POST` | `/api/classify` | Single sentence classification | `{ text: "...", config: { k: 0 } }` | `{ success: true, result: { sentiment, requirement_category, evidence, explanation, confidence, model, k } }` |
| `POST` | `/api/batch-classify` | Throttled batch classification | `{ items: [{ id, text }], config: { k: 0, concurrency: 3 } }` | `{ success: true, total, processed, results: [...] }` |

---

## 7. Research Integrity & Benchmark Status

1. **Experimental Values Marked as Pending:** Per Section I and Section X of the manuscript, benchmark Macro-F1 scores in Table VI remain marked as `[Pending Gold Annotation]`. Interactive model predictions in the prototype are not counted as completed experimental results.
2. **No Circular Pseudo-Labeling:** The supervised Linear SVM baseline is not trained on regex heuristic outputs, as this would produce invalid circular evaluation figures.
3. **Krippendorff's Alpha:** Computed strictly across dual independent human annotations ($m=2$). Automated model predictions and adjudicated gold labels are excluded from agreement calculations.
4. **Domain Scope:** The available SemEval-2015 dataset includes Laptop (2,314 rows) and Restaurant (1,847 rows) reviews. This exploratory comparison is distinct from the manuscript's proposed Amazon-to-AWARE cross-domain study.
