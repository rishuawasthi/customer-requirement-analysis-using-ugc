# Viva Preparation & Academic Defense Guide
**Project Title:** Designing a Benchmark for Classifying Explicit Needs, Implicit Needs, and Pain Points in User-Generated Content  
**Authors:** Rupika Upadhyay, Roshni Singh, Ronak Garg, Rishu Awasthi  
**Supervisor:** Mr. Praveen Kumar Rai  
**Course:** BCS554 (5th Semester Mini Project), ABES Engineering College  
**Target:** Final Viva, Examiner Evaluation, and Project Presentation

---

## 1. 2-Minute Elevator Pitch for Examiners

> *"Good morning, respected examiners. Modern companies receive thousands of user-generated reviews, survey responses, and feedback submissions every day. Existing tools use sentiment analysis or aspect-based sentiment analysis to tell us whether a customer is happy or upset, and what feature they are talking about.*
>
> *However, sentiment alone does NOT tell product teams and software engineers **what needs to be built, fixed, or modified**.*
>
> *Our project addresses this exact research gap. We designed an operational four-class taxonomy distinguishing:
> 1. **Explicit Needs:** where a user directly requests a change ('Please add dark mode').
> 2. **Implicit Needs:** where a need is inferable from a workaround or friction without a direct command ('The screen is too bright to read at night').
> 3. **Pain Points:** severe dissatisfaction or crashes with no inferable desired feature ('The checkout crashes repeatedly').
> 4. **Non-Actionable Content:** general praise or commentary ('Great app, five stars').*
>
> *We have formulated a formal experimental benchmark comparing traditional machine learning (TF-IDF + Linear SVM), fine-tuned RoBERTa, and Few-Shot LLM prompting. We implemented an interpretable linguistic heuristic baseline prototype, an independent two-annotator study framework with nominal Krippendorff's alpha, and a dynamic dataset evaluation environment using the SemEval-2015 benchmark.*
>
> *Crucially, in accordance with research integrity, we present empirical model metrics as pending until large-scale human gold-standard annotation is complete, avoiding synthetic or circular accuracy claims."*

---

## 2. Core Viva Defense Questions & Bulletproof Answers

### Q1: Why are the accuracy and Macro-F1 tables in your research paper marked as "[Pending]"?
**Examiner intent:** Checking if you copied a paper or fabricated numbers.  
**Bulletproof Answer:**  
*"Respected examiner, we maintained strict scientific integrity throughout this research. As stated explicitly in Section I and Section X of our IEEE manuscript, our current contribution is the formal benchmark design, the operational taxonomy, and the experimental protocol. Rather than fabricating synthetic numbers or claiming an illustrative test is an empirical result, we marked all empirical metrics as pending until the pilot annotation round is complete and adjudicated. Our supervisor emphasized that scientific honesty is paramount."*

---

### Q2: Why did you exclude "unmet need" and "emerging need" from your four-class taxonomy?
**Examiner intent:** Testing whether you understand construct validity and sentence-level NLP constraints.  
**Bulletproof Answer:**  
*"In Section V of our paper, we deliberately excluded unmet needs and emerging needs from the sentence-level taxonomy:
1. **Unmet Need:** Establishing whether a need is truly unmet requires external evidence—namely, a product specification sheet or code repository to prove that the feature does not already exist. That information is external to the review sentence itself.
2. **Emerging Need:** Establishing whether a need is emerging requires longitudinal time-series data to measure velocity or rate-of-change over weeks or months. It cannot be deduced from a single isolated sentence.
Therefore, we restricted our sentence-level taxonomy to four intrinsic classes: Explicit Need, Implicit Need, Pain Point, and Non-Actionable."*

---

### Q3: Why is sentiment analysis insufficient for requirements engineering?
**Examiner intent:** Testing whether you understand the fundamental research gap between ABSA and Needmining.  
**Bulletproof Answer:**  
*"Sentiment analysis tells you emotional polarity—positive, negative, or neutral. Aspect-based sentiment analysis adds the product feature, such as 'Battery: Negative'. But a negative sentiment does not mean an explicit requirement:
- 'The battery drains quickly' is an implicit friction (implies longer battery life).
- 'The battery caught fire' is a severe pain point/defect.
- 'Please provide an 8-cell battery option' is an explicit feature request.
- 'I dislike the color' is negative sentiment, but non-actionable.
Software engineers need actionable requirements, not just polarity scores."*

---

### Q4: Why did you use nominal Krippendorff's alpha instead of Cohen's kappa or raw percent agreement?
**Examiner intent:** Testing your mathematical understanding of inter-annotator agreement.  
**Bulletproof Answer:**  
*"We selected nominal Krippendorff's alpha ($\alpha$) for three key reasons:
1. **Raw percent agreement** does not account for agreements occurring by chance.
2. **Cohen's kappa** is limited to exactly two coders with fixed marginal distributions and cannot handle missing units seamlessly.
3. **Krippendorff's alpha** is the established computational linguistics standard (Artstein & Poesio, 2008). It corrects for chance expected disagreement $D_e$, operates at the nominal level of measurement appropriate for unordered categories, and interprets $\alpha \ge 0.80$ as reliable for definitive conclusions and $0.67 \le \alpha < 0.80$ as tentative."*

---

### Q5: Why didn't you train the TF-IDF + Linear SVM model on the dataset right now?
**Examiner intent:** Testing if you understand supervised learning requirements and circular pseudo-labeling.  
**Bulletproof Answer:**  
*"Supervised machine learning requires genuine, human-verified ground-truth requirement labels.
1. The SemEval dataset only provides sentiment polarity labels (Positive/Negative/Neutral), not requirement labels. Training an SVM on sentiment would train a sentiment classifier, not a requirements classifier.
2. If we trained an SVM on our regex rule outputs, the model would simply approximate the regex heuristics—a circular pseudo-labeling flaw that yields meaningless accuracy figures.
Therefore, we implemented the rule-based heuristic as the transparent baseline, and reserved SVM and RoBERTa training until the pilot human double-annotation and adjudication are complete."*

---

### Q6: How does the SemEval dataset relate to the Amazon and AWARE datasets in your paper?
**Examiner intent:** Checking if you are claiming that SemEval represents Amazon/AWARE.  
**Bulletproof Answer:**  
*"In our manuscript, the proposed future experimental setup is Amazon product reviews (in-domain) and AWARE application reviews (out-of-domain). However, for our 5th-semester prototype implementation, we utilized the SemEval-2015 Task 12 benchmark, which contains two distinct real-world domains: Laptop product reviews (2,314 rows) and Restaurant service reviews (1,847 rows). This allows us to demonstrate real-world UGC ingestion, aspect analysis, and domain differences in the working application without confusing it with the pending AWARE study."*

---

## 3. Step-by-Step Viva Demonstration Walkthrough

When the examiner asks you to demonstrate your project, follow this exact sequence:

1. **Tab 1: Overview Dashboard**
   - Point out the active dataset: `semeval2015_research_ready.csv` (Curated 45-Set).
   - Show the Heuristic Predictions Distribution across the 4 classes.
   - Point out the explicit disclaimer: *"This is a rule-based heuristic baseline, not fabricated neural network output."*
   - Highlight the original SemEval polarity breakdown vs requirement classes.

2. **Tab 2: Feedback Analysis (Live Tester)**
   - Select a sentence with an explicit request: show the matched linguistic cue (e.g., `please add`, imperative verb) and explanation.
   - Select a sentence with an implicit need: show the counterfactual wish or friction cue (e.g., `I wish it had`, `difficult to use`).
   - Use the **Custom Sentence Live Tester** at the top:
     - Type: *"Please add support for UPI and Google Pay"* $\rightarrow$ Classifies as **EXPLICIT_NEED**.
     - Type: *"I have to carry three chargers because the battery doesn't last two hours"* $\rightarrow$ Classifies as **IMPLICIT_NEED**.
     - Type: *"The app freezes and crashes every time I tap pay"* $\rightarrow$ Classifies as **PAIN_POINT**.
     - Type: *"Good food, five stars"* $\rightarrow$ Classifies as **NON_ACTIONABLE**.

3. **Tab 3: Human Annotation & Krippendorff's Alpha**
   - Explain the two independent annotator roles (Annotator A vs Annotator B).
   - Show how a disagreement is detected when Annotator A and B choose different categories.
   - Show the Adjudication panel where the third-pass gold label and rationale are assigned.
   - Show the live Krippendorff's Alpha scorecard ($\alpha$, observed agreement %, paired units count).

4. **Tab 4: Evaluation & Benchmark**
   - Show the formal Research Questions (RQ1–RQ4).
   - Show Table V and Table VI from your IEEE manuscript, showing how every pending cell is honestly documented.
   - Walk through the SemEval Laptop vs Restaurant descriptive comparison.
   - Show Table VII detailing the 10 failure modes planned for qualitative error analysis.

5. **Tab 5: Dataset Switcher**
   - Click **"Switch to Full 4,161 Benchmark"**.
   - Show how the entire application instantly processes the 4,161 rows across 531 unique reviews and 3,054 unique sentences without lagging or breaking.
   - Switch back to the curated 45-set to show seamless flexibility.
