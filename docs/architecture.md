# Customer Requirement Analysis Using User Generated Content
## System Architecture Specification

### 1. Abstract & Scope
This project presents an NLP-driven framework designed to extract, analyze, and prioritize software and product requirements from unstructured User Generated Content (UGC), including product reviews, survey submissions, customer feedback forms, and forum discussions.

---

### 2. High-Level System Architecture

```
                  +--------------------------------+
                  |     Customer UGC Sources       |
                  | (Reviews, Surveys, Feedback)   |
                  +---------------+----------------+
                                  |
                                  v
                  +--------------------------------+
                  |       Frontend (React.js)      |
                  |  - Dashboard Analytics         |
                  |  - Requirement Details Modal   |
                  |  - Single Feedback Live Tester |
                  |  - CSV Upload & Pipeline View  |
                  +---------------+----------------+
                                  | HTTP / REST
                                  v
                  +--------------------------------+
                  |  Backend API (Spring Boot 3)   |
                  |  - UGC Ingestion Service       |
                  |  - Priority Calculation Engine |
                  |  - Trend & Velocity Analyzer   |
                  |  - Traceability Data Access    |
                  +-------+----------------+-------+
                          |                |
             Internal REST|                | Spring Data JPA
                          v                v
          +-----------------------+  +-------------------+
          | Python NLP (FastAPI)  |  | PostgreSQL 18 DB  |
          | - Text Preprocessing  |  | - feedbacks       |
          | - Sentiment Analysis  |  | - requirements    |
          | - Aspect Extraction   |  | - clusters        |
          | - Req. Extractor      |  | - evidence links  |
          | - Semantic Embeddings |  | - trend logs      |
          | - Req. Clustering     |  +-------------------+
          +-----------------------+
```

---

### 3. Pipeline Stages

1. **UGC Collection & CSV Validation**: Ingests feedback containing `id`, `source`, `date`, and `text`. Validates format and checks for duplicate/empty entries.
2. **Text Preprocessing**: Cleans whitespace, handles punctuation noise, normalizes text while maintaining semantic structure for NLP models.
3. **Sentiment Analysis**: Classifies sentiment into `POSITIVE`, `NEGATIVE`, or `NEUTRAL` with an explicit confidence score.
4. **Aspect Analysis**: Identifies core target domains (e.g. *Delivery*, *Customer Support*, *Payment*, *UI*, *Performance*, *Refund*, *Product Quality*).
5. **Requirement Extraction**: Transforms feedback into actionable engineering requirements:
   - **Explicit**: Directly requested feature (e.g., *"Please add dark mode"*).
   - **Implicit / Candidate**: Complaint/opinion mapped to latent requirement (e.g., *"Screen is too bright at night"* $\rightarrow$ *"Add dark mode support"*).
6. **Semantic Embeddings**: Converts sentences into dense vectors using semantic transformers so that differently worded inputs map to proximate vector spaces.
7. **Requirement Clustering**: Groups related vectors via Cosine Similarity / Agglomerative Clustering into canonical requirements.
8. **Priority Calculation**:
   $$\text{Priority Score} = 0.35 \times \text{Frequency} + 0.30 \times \text{Negative Sentiment} + 0.20 \times \text{Trend} + 0.15 \times \text{Impact}$$
9. **Trend Analysis & Emerging Detection**: Analyzes week-over-week mention velocity; requirements with high positive rate-of-change are highlighted as *Emerging*.
10. **Explainable Traceability**: Links every canonical requirement back to exact customer evidence rows.
