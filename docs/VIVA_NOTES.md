# Viva Preparation & Academic Defense Guide
**Project Title:** Designing a Benchmark for Classifying Explicit Needs, Implicit Needs, and Pain Points in User-Generated Content  
**Authors:** Rupika Upadhyay, Roshni Singh, Ronak Garg, Rishu Awasthi  
**Supervisor:** Mr. Praveen Kumar Rai  
**Course:** BCS554 (5th Semester Mini Project), ABES Engineering College  
**Target:** Final Viva, Examiner Evaluation, and Project Presentation

---

## 1. 2-Minute Elevator Pitch for Examiners

> *"Good morning, respected examiners. Modern software companies receive thousands of user-generated reviews, survey responses, and customer feedback submissions daily. Existing tooling relies on traditional sentiment analysis or aspect-based sentiment analysis, which only answers how a customer feels and what feature they are talking about.*
>
> *However, sentiment alone does NOT tell product teams and software engineers **what needs to be built, fixed, or modified**.*
>
> *Our project addresses this exact research gap. We designed an operational four-class taxonomy distinguishing:
> 1. **Explicit Needs:** direct customer requests for features or fixes ('Please add dark mode').
> 2. **Implicit Needs:** needs inferable from described workarounds or friction without a direct command ('The screen is too bright to read at night').
> 3. **Pain Points:** acute dissatisfaction, crashes, or failures with no inferable desired feature ('The checkout crashes repeatedly').
> 4. **Non-Actionable Content:** general praise or commentary ('Great app, five stars').*
>
> *Our prototype implements a **Multi-Model Architecture**:
> - A transparent, deterministic **Rule-Based Heuristic Baseline** matching syntactic and modal cues.
> - An advanced **Google Gemini AI Classifier** via the official `@google/genai` SDK, producing structured JSON classifying both **Sentiment** and **Requirement Category** in parallel.
> - An **Independent Human Annotation Workbench** with live nominal Krippendorff's alpha reliability scoring.
> - A **Dataset Switcher** supporting both our curated 45-record presentation set and the full 4,161-row SemEval benchmark.*
>
> *Crucially, we maintain strict scientific integrity: empirical model benchmark scores in Table VI remain marked as pending until large-scale human gold-standard annotation is finalized, avoiding synthetic or circular accuracy claims."*

---

## 2. Top Examiner Viva Questions & Bulletproof Answers

### Q1: Why did you integrate Google Gemini AI alongside the rule-based heuristic?
**Examiner intent:** Testing whether you understand the multi-model comparison objective in Section I and Section III of your paper.  
**Bulletproof Answer:**  
*"In Section III of our manuscript, our core research question is comparing traditional methods against modern LLM prompting on identical review data. The regex heuristic serves as an interpretable, zero-cost, deterministic baseline that captures explicit syntactic cues ('please add', 'we need'). Google Gemini represents the state-of-the-art LLM arm that can comprehend complex semantic context, subtle customer workarounds, and indirect counterfactual wishes that rigid regex rules miss. The application allows examiners to compare both model outputs side by side on any review."*

---

### Q2: Why did you build a Node.js Express backend instead of calling Gemini directly from React?
**Examiner intent:** Testing your understanding of software security, API key protection, and web architecture.  
**Bulletproof Answer:**  
*"Calling an LLM API directly from browser React code is an insecure anti-pattern: it exposes the `GEMINI_API_KEY` to any user inspecting browser network requests or client bundles. Our architecture uses a dedicated Node.js Express backend where the API key resides strictly in server environment variables. The backend provides input validation, rate-limit backoff, structured JSON response verification, and controlled concurrency for batch inference."*

---

### Q3: Why are Sentiment Polarity and Customer Requirement Category evaluated as two separate dimensions?
**Examiner intent:** Checking if you understand the conceptual independence of sentiment and need.  
**Bulletproof Answer:**  
*"Sentiment indicates emotional tone (Positive, Negative, Neutral, Mixed), while requirement indicates actionability (Explicit Need, Implicit Need, Pain Point, Non-Actionable). They are conceptually independent:
- 'This app is awful, please add an offline backup option' is **Negative Sentiment**, but an **Explicit Need** (direct request overrides negativity).
- 'I have to carry three chargers because the battery doesn't last' is **Negative Sentiment**, but an **Implicit Need**.
- 'The checkout crashed and ruined my order' is **Negative Sentiment** and a **Pain Point**.
- 'Great service, 5 stars' is **Positive Sentiment**, but **Non-Actionable**.
Evaluating them independently prevents conflating emotional dissatisfaction with actionable engineering requirements."*

---

### Q4: Why are benchmark Macro-F1 scores in Table VI marked as "[Pending]"?
**Examiner intent:** Checking if you copied a paper or fabricated numbers.  
**Bulletproof Answer:**  
*"We maintained strict scientific integrity throughout this research. As stated explicitly in Section I and Section X of our IEEE manuscript, our current contribution is the formal benchmark design, the operational taxonomy, and the experimental protocol. Rather than fabricating synthetic numbers or claiming an illustrative test is an empirical result, we marked all empirical metrics as pending until the pilot annotation round is complete and adjudicated."*

---

### Q5: Why did you exclude "unmet need" and "emerging need" from your four-class taxonomy?
**Examiner intent:** Testing whether you understand construct validity and sentence-level NLP constraints.  
**Bulletproof Answer:**  
*"In Section V of our paper, we deliberately excluded unmet needs and emerging needs:
1. **Unmet Need:** Establishing whether a need is truly unmet requires external evidence—namely, a product specification sheet or code repository to prove that the feature does not already exist. That information is external to the review sentence itself.
2. **Emerging Need:** Establishing whether a need is emerging requires longitudinal time-series data to measure velocity or rate-of-change over weeks or months. It cannot be deduced from a single isolated sentence.
Therefore, we restricted our sentence-level taxonomy to four intrinsic classes: Explicit Need, Implicit Need, Pain Point, and Non-Actionable."*

---

### Q6: Why did you use nominal Krippendorff's alpha instead of Cohen's kappa or raw percent agreement?
**Examiner intent:** Testing your mathematical understanding of inter-annotator agreement.  
**Bulletproof Answer:**  
*"We selected nominal Krippendorff's alpha ($\alpha$) for three key reasons:
1. **Raw percent agreement** does not account for agreements occurring by chance.
2. **Cohen's kappa** is limited to exactly two coders with fixed marginal distributions and cannot handle missing units seamlessly.
3. **Krippendorff's alpha** is the established computational linguistics standard (Artstein & Poesio, 2008). It corrects for chance expected disagreement $D_e$, operates at the nominal level of measurement appropriate for unordered categories, and interprets $\alpha \ge 0.80$ as reliable for definitive conclusions and $0.67 \le \alpha < 0.80$ as tentative."*

---

### Q7: Why didn't you train the TF-IDF + Linear SVM model on the dataset right now?
**Examiner intent:** Testing if you understand supervised learning requirements and circular pseudo-labeling.  
**Bulletproof Answer:**  
*"Supervised machine learning requires genuine, human-verified ground-truth requirement labels.
1. The SemEval dataset only provides sentiment polarity labels (Positive/Negative/Neutral), not requirement labels. Training an SVM on sentiment would train a sentiment classifier, not a requirements classifier.
2. If we trained an SVM on our regex rule outputs, the model would simply approximate the regex heuristics—a circular pseudo-labeling flaw that yields meaningless accuracy figures.
Therefore, we implemented the rule-based heuristic as the transparent baseline, and reserved SVM and RoBERTa training until the pilot human double-annotation and adjudication are complete."*

---

## 3. Step-by-Step Viva Demonstration Walkthrough

Follow this exact walkthrough during your viva:

1. **Step 1: Start Both Servers on Windows**
   - Terminal 1 (Backend): `npm run server` (Running on `http://localhost:5000`)
   - Terminal 2 (Frontend): `npm run dev` (Running on `http://localhost:3000`)

2. **Step 2: Overview Tab**
   - Show the active dataset: `semeval2015_research_ready.csv` (Curated 45-Set).
   - Point out the 5 quantitative summary cards: Total Rows, Heuristic Baseline count, Gemini AI count, Actionable Needs, and Human Double-Annotated pairs.
   - Point out the research integrity notice explaining that counts represent heuristic predictions, not ground truth.

3. **Step 3: Feedback Analysis Tab (Model Comparison)**
   - Select a record in the table.
   - Click **"Run Heuristic"** $\rightarrow$ Show the matched regex cues and linguistic explanation on the left card.
   - Click **"Classify with Gemini AI"** $\rightarrow$ Show the Gemini structured output on the right card (Sentiment badge, Requirement category badge, verbatim evidence span, scientific explanation, model-reported confidence).
   - Use the **Interactive Multi-Model Tester**:
     - Type: *"Please add support for UPI and PhonePe"* $\rightarrow$ Both models classify as **EXPLICIT_NEED**.
     - Type: *"I have to carry three chargers because the battery doesn't last two hours"* $\rightarrow$ Both models classify as **IMPLICIT_NEED** (Sentiment: **NEGATIVE**).
     - Type: *"App freezes and crashes every time I tap pay"* $\rightarrow$ Both models classify as **PAIN_POINT** (Sentiment: **NEGATIVE**).
     - Type: *"Great service, five stars"* $\rightarrow$ Both models classify as **NON_ACTIONABLE** (Sentiment: **POSITIVE**).

4. **Step 4: Human Annotation & Alpha Tab**
   - Demonstrate the dual independent roles: Annotator A submits a label, Annotator B submits independently.
   - Show how a disagreement triggers the Adjudication panel per Section VII of the manuscript.
   - Show the live Krippendorff's Alpha scorecard with mathematical interpretation.

5. **Step 5: Evaluation & Benchmark Tab**
   - Walk the examiner through RQ1–RQ4.
   - Show Table V (Dataset Statistics) and Table VI (Model Macro-F1 comparison), highlighting that pending cells are honestly preserved.
   - Show Table VII detailing the 10 failure modes planned for qualitative error analysis.

6. **Step 6: Dataset Switcher Tab**
   - Switch to **"Full 4,161-Row SemEval Benchmark"** to prove the app handles real-world scale (531 reviews, 3,054 sentences) without lag or memory leaks.
   - Switch back to the curated 45-set for swift demonstration.
