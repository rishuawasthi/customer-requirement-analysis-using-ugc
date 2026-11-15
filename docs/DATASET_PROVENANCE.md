# Dataset Provenance, Attribution & Research Licensing
**Project:** Customer Requirement Analysis Using User Generated Content  
**Benchmark:** SemEval-2015 Task 12 (Aspect Based Sentiment Analysis)  
**Authors:** Maria Pontiki, Dimitris Galanis, Haris Papageorgiou, Suresh Manandhar, Ion Androutsopoulos

---

## 1. Dataset Origin & Academic Provenance

The research dataset utilized in this project originates from the **SemEval-2015 Task 12: Aspect Based Sentiment Analysis (ABSA)** competition:
- **Corpus Domains:** Laptop product reviews and Restaurant service customer reviews.
- **Publication Citation:**  
  *Maria Pontiki, Dimitris Galanis, Haris Papageorgiou, Suresh Manandhar, and Ion Androutsopoulos.*  
  "SemEval-2015 Task 12: Aspect Based Sentiment Analysis."  
  *Proceedings of the 9th International Workshop on Semantic Evaluation (SemEval 2015)*, pages 486–495, Denver, Colorado, June 4-5, 2015.

---

## 2. Licensing and Terms of Use

- **Academic & Research Use:** SemEval evaluation datasets are distributed specifically for academic, scientific, and educational research benchmarking under standard computational linguistics evaluation terms (Creative Commons / Non-Commercial Research Evaluation).
- **Redistribution Policy:** If you plan to redistribute this code or benchmark commercially, obtain original data directly from the official SemEval repository:  
  [https://alt.qcri.org/semeval2015/task12/](https://alt.qcri.org/semeval2015/task12/)

---

## 3. Dataset Preservation & Structure in this Project

1. **`semeval2015_research_ready.csv` / `.xlsx` (Curated 45-Set):**
   - 45 authentic sentences (25 Laptop, 20 Restaurant) curated for viva demonstrations.
   - Preserves original IDs (`LAP_001`–`LAP_025`, `REST_001`–`REST_020`), original text, aspect categories, and sentiment polarity.
2. **`semeval2015_research_ready_full.csv` (Full 4,161 Benchmark):**
   - 4,161 rows across 531 unique reviews and 3,054 unique sentences.
   - Retains `review_id`, `sentence_id`, `domain`, `sentence_text`, `target`, `category`, `polarity`, `annotation_status`.
   - Never modified or synthesized; original annotations remain immutable.
