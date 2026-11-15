# Customer Requirement Analysis Using User Generated Content

A clean, functional college mini-project prototype for analyzing and categorizing customer requirements from unstructured User-Generated Content (UGC) such as product reviews and customer feedback.

## Project Overview

In software and product development, customers often express critical requirements, desires, and bug reports through unstructured online reviews. Traditional sentiment analysis only flags polarity (positive, negative, or neutral), which does not provide actionable guidance for engineering backlogs.

This prototype demonstrates how customer feedback can be categorized into four operational requirement classes:
1. **EXPLICIT_NEED**: Direct customer requests or commands for a feature or service (e.g., *"Please add an option to disable backlight timeout"*).
2. **IMPLICIT_NEED**: Indirect customer desires, counterfactual wishes, or usability friction indicating an unmet requirement (e.g., *"I wish the battery lasted 7 hours"*).
3. **PAIN_POINT**: Descriptions of acute system malfunctions, bugs, crashes, or severe operational defects (e.g., *"The machine froze completely three times today"*).
4. **NON_ACTIONABLE**: General praise, aesthetic opinions, or commentary without engineering requirement implications (e.g., *"Solid aluminum chassis and lightweight"*).

---

## Academic Methodology Note

- **Baseline Classification Approach**: This prototype implements a transparent, deterministic rule-based linguistic heuristic baseline. It matches syntactic and lexical cues (imperative modal verbs, counterfactual wish markers, failure descriptors).
- **Honest Academic Disclosure**: This is an interpretable baseline prototype, not a black-box deep neural network. No synthetic or fabricated metrics (such as fake F1 scores or artificial confidence percentages) are displayed. All dataset statistics are calculated dynamically from real imported records.
- **Dataset Distinction**: In the SemEval-2015 Task 12 benchmark, original labels represent sentiment polarity and aspect categories. This application explicitly preserves and separates those original labels from our requirement categories.

---

## Four Main Sections

1. **Overview**: Summary of loaded records, real counts of categorized feedback, word-count distributions, and breakdown of original SemEval benchmark labels.
2. **Feedback Analysis**: Searchable and filterable feedback table, single-sentence analyzer, manual annotation verification tool, custom sentence tester, batch classifier, and CSV export.
3. **Dataset**: Excel (`.xlsx`, `.xls`) and CSV dataset loader, schema inspection tool separating text from metadata, and raw tabular data view.
4. **About the Project**: Academic documentation covering the problem statement, requirement category definitions with authentic examples, the end-to-end workflow pipeline, and honest prototype limitations.

---

## Installation & Startup Instructions

### Prerequisites
- Node.js (version 18 or higher)
- npm (version 9 or higher)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
The application will start on `http://localhost:3000`.

### 3. Build for Production
```bash
npm run build
```

---

## How to Import the Dataset

The application supports both **Microsoft Excel (`.xlsx`, `.xls`)** and **CSV (`.csv`)** files.

### Option 1: Load the Bundled SemEval-2015 Dataset (Recommended for Demo)
1. Open the application and navigate to the **Dataset** tab.
2. Click **Load semeval2015_research_ready.xlsx** or **Load CSV Version**.
3. The dataset will load immediately, inspect columns (`id`, `text`, `aspect_category`, `aspect_term`, `polarity`), and populate the table.

### Option 2: Upload Custom Excel or CSV File
1. Navigate to the **Dataset** tab.
2. In the "Import Custom File" card, click **Browse Dataset File...**.
3. Select your `.xlsx`, `.xls`, or `.csv` file.
4. The parser will automatically scan the headers, identify the column containing customer feedback sentences (e.g. `text`, `sentence`, `review`, or `feedback`), and extract all metadata columns.
5. If the file is missing headers or empty, a helpful validation message will appear on screen.

---

## Exporting Results for Academic Reports

You can download the analyzed dataset at any time as an RFC-4180-compliant CSV file (with UTF-8 BOM encoding for seamless opening in Microsoft Excel, Google Sheets, or Python pandas).

### Export Options:
- **From Overview Tab:** Click **Download Results (CSV)** in the top banner or use the **Academic Project Report Deliverable** card.
- **From Feedback Analysis Tab:**
  - Click **Quick CSV** to instantly download all records with analysis categories, linguistic explanations, and metadata.
  - Click **Export Report...** to choose specific scopes:
    - *Complete Dataset*
    - *Actionable Requirements Only* (`EXPLICIT_NEED` + `IMPLICIT_NEED` + `PAIN_POINT`)
    - *Analyzed / Classified Records Only*
    - *Filtered View* (matching current search keyword or selected category)
- **Columns Included in Exported CSV:**
  - `id`: Feedback sentence identifier.
  - `feedback_text`: The customer sentence analyzed.
  - `requirement_category`: Category enum (`EXPLICIT_NEED`, `IMPLICIT_NEED`, `PAIN_POINT`, `NON_ACTIONABLE`).
  - `category_readable_label`: Human-friendly label (e.g., *Explicit Need*).
  - `classification_method`: *Rule-Based Linguistic Heuristic* or *Manual Academic Annotation*.
  - `matched_linguistic_cues`: The exact phrases/verbs that triggered the classification rule.
  - `explanation_and_rationale`: Scientific justification of the classification.
  - `is_user_annotated`: Boolean flag indicating whether the sentence was manually verified.
  - `original_*`: Preserves all original columns from the benchmark (such as `aspect_category`, `polarity`, `target`).

