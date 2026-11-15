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
> *Our prototype implements a **Multi-Model Benchmark Architecture**:
> - A transparent, deterministic **Rule-Based Heuristic Baseline** matching syntactic and modal cues.
> - **Model Arm 1 (Linear SVM):** Sublinear TF-IDF (1-2 ngrams) + balanced LinearSVC with calibrated continuous confidence.
> - **Model Arm 2 (RoBERTa-base):** 4-way sequence classification transformer with hardware detection (RTX 3050 / CPU fallback).
> - **Model Arm 3 (Google Gemini 2.5 Flash):** Zero-shot ($k=0$) and few-shot ($k=2, 4, 8$ per class) prompting drawing exemplars strictly from the training split.
> - An **Independent Human Annotation Workbench** with live nominal Krippendorff's alpha reliability scoring.
> - **Two Dataset Modes:** Mode A (Human Gold Benchmark) with strict training refusal when human labels are below threshold, and Mode B (Exploratory Weak Supervision) to demonstrate the full pipeline, 95% bootstrap CI, and 4×4 confusion matrix."*

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

### Q4: How did you prevent data leakage across train, validation, and test splits?
**Examiner intent:** Checking if you understand intra-review leakage in multi-sentence NLP benchmarks.  
**Bulletproof Answer:**  
*"In user reviews, multiple sentences from the same review often share identical vocabulary, product names, and author writing style. If random sentence splitting were used, sentence 1 of a review could end up in training while sentence 2 is in test, creating severe intra-review data leakage. We enforce **review-level group partitioning** ($70/15/15$ split) using salted cryptographic hashing of `review_id` (seed=42). This mathematically guarantees that all sentences from a review reside in the exact same partition with zero overlap across train, val, and test."*

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

### Q7: How does your benchmark handle Model Arm 1 (Linear SVM) and Model Arm 2 (RoBERTa)?
**Examiner intent:** Checking whether you understand supervised training requirements and Mode A vs Mode B.  
**Bulletproof Answer:**  
*"We support two transparent modes:
- **Mode A (Human Gold Benchmark):** Evaluated strictly on human-adjudicated labels. If fewer than 4 examples per class exist in training, training is safely blocked with exact counts reported. No circular pseudo-labeling is permitted.
- **Mode B (Exploratory Weak AI Supervision):** Uses rule-based weak supervision labels on the 70/15/15 review split to train Linear SVM and verify the full MLOps pipeline: generating 95% bootstrap confidence intervals (1,000 resamples), a 4×4 confusion matrix, and misclassification error analysis."*

---

### Q8: What is the primary evaluation metric and how is the 95% bootstrap confidence interval computed?
**Examiner intent:** Checking statistical evaluation knowledge.  
**Bulletproof Answer:**  
*"The primary metric is **Macro-F1**, calculated as the unweighted arithmetic mean of F1 scores across the four categories:
$$\text{Macro-F1} = \frac{1}{4} \sum_{c=1}^{4} \text{F1}_c$$
To measure statistical significance and variance on test data without assuming Gaussian distributions, we compute a non-parametric 95% bootstrap confidence interval using 1,000 percentile bootstrap resamples (seed=42) taking the 2.5th and 97.5th percentiles."*

---

## 3. Step-by-Step Viva Demonstration Walkthrough

Follow this exact walkthrough during your viva to demonstrate the restructured 3-section academic dashboard:

1. **Section 1: Implementation (Default Landing Page):**
   - Show the curated 45-set loaded automatically from SemEval.
   - Point out the 4-Model Comparative Board (Heuristic, Linear SVM, RoBERTa-base, Gemini).
   - Show live Gemini classification with zero-shot and few-shot ($k \in \{0, 2, 4, 8\}$).
   - Use the Custom Feedback Tester with a tricky sentence:
     - *"The screen goes black when I plug in the HDMI cable"* $\to$ Classifies as **PAIN_POINT**.
     - *"Could you please add dark mode support in the next update?"* $\to$ Classifies as **EXPLICIT_NEED**.
     - *"I wish I didn't have to keep a notebook next to my bed to remember tasks"* $\to$ Classifies as **IMPLICIT_NEED**.

2. **Section 2: Research:**
   - **Taxonomy Tab:** Explain the 4 categories, inclusion/exclusion rationale, and boundary rules.
   - **Annotation Tab:** Demonstrate Coder A vs Coder B annotation and live nominal Krippendorff's alpha.
   - **Benchmark Tab:** Show Table VI with the Mode A / Mode B switch, 4×4 confusion matrix, and the boundary confusion between Implicit Need and Pain Point.

3. **Section 3: Documentation:**
   - Show the IEEE paper overview, dataset provenance and attribution, and mathematical appendix.
