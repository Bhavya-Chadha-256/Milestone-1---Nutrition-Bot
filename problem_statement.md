# Problem Statement — Dietary Guidance RAG Chatbot
**Milestone 2 · Context Setup**

---

## 1. Overview

This milestone involves building a **prototype RAG (Retrieval-Augmented Generation) chatbot** that answers questions about food, nutrition, and food safety. The chatbot is grounded exclusively in **official public dietary guidance documents** — every answer it produces must be traceable to a cited source. When the available guidance does not cover a question, the assistant explicitly says so.

This prototype forms the foundation of a larger service that will eventually answer questions such as:
- *"Is this a reasonable way to eat?"*
- *"How long can I keep this in the fridge?"*

---

## 2. Motivation & Problem Context

Health authorities around the world publish authoritative, carefully researched guidance on nutrition and food safety — typically as long, dense PDFs. These documents are:
- **Publicly available** but rarely read.
- **Written in prose**, not exposed through a structured API.
- **Scattered across multiple organisations** (national nutrition institutes, food safety regulators, international health bodies).

This gap between high-quality guidance and actual public consumption is precisely what RAG is designed to address. By placing a retrieval layer beneath a language model, the chatbot can surface accurate, cited, authoritative answers directly from these documents — without hallucinating or generalising beyond what the documents actually say.

> **Important scope boundary:** Nutrient numbers for individual foods (e.g., calories, macros per 100g) are **structured database data** and do **not** belong in this milestone. Those will be handled via a separate database integration in Milestone 3.

---

## 3. Goals

| Goal | Description |
|------|-------------|
| **Grounded answers** | The chatbot answers only from retrieved document chunks — no free-form generation beyond what the corpus supports. |
| **Full citation** | Every claim carries a citation: document name, publisher, year, and a source link. |
| **Cross-document synthesis** | When multiple documents address a question (e.g., cooking oils discussed by both a nutrition institute and a food safety regulator), each source is cited separately — claims are never blended. |
| **Honest refusal** | The chatbot clearly distinguishes between *"the corpus doesn't cover this"* and *"this is out of scope by design"*. |

---

## 4. The Pipeline

The system is built as a sequential pipeline with five major components:

### 4.1 Corpus
- Gather **5–7 public dietary guidance documents** from recognised authorities:
  - National nutrition institutes
  - Food safety regulators
  - International health bodies (e.g., WHO, FAO)
- **Written prose only** — any source with a clean structured API behind it does not belong here.
- Each document must be stored with the following metadata:
  - Publisher
  - Year of publication
  - Source URL
  - Retrieval date

### 4.2 Chunking
- Every chunk must carry:
  - Document name
  - Publisher
  - Year
  - Section heading
- **Fixed-size chunking is insufficient** — these documents contain tables and numbered recommendations that naive chunking will split incorrectly.
- The chunking strategy chosen must be documented in the README, including its tradeoffs and what it cost (e.g., loss of table structure, heading orphaning, etc.).

### 4.3 Retrieval
- Build a **vector index** over all chunks.
- The retrieval layer must support two modes:
  1. **Global retrieval** — search across all documents in the corpus.
  2. **Filtered retrieval** — restrict search to a single named document.

### 4.4 Answer Layer
- The assistant generates answers **only from retrieved chunks**.
- Every factual claim in the response must carry a citation in the format:
  > *Document Name* — *Publisher*, *Year* · [Source Link]
- No generation beyond the retrieved context is permitted.

### 4.5 Cross-Document Questions
- Some questions will have multiple documents with relevant content (e.g., cooking oil safety, where a nutrition body and a food safety regulator both have guidance).
- In these cases:
  - **Answer per document**, with separate citations for each.
  - **Never blend** two sources into a single synthesised claim about what "the guidelines say".

---

## 5. Refusal Mechanisms

The chatbot must implement **two distinct types of refusal**, enforced in code:

### 5.1 Not in the Corpus
- **Trigger:** The retrieved chunks do not contain information sufficient to answer the question.
- **Behaviour:** The assistant states that the guidance does not cover this question and names the documents it searched.
- **Example response pattern:** *"I searched [Document A] and [Document B] but neither covers this topic."*

### 5.2 Out of Scope by Design
- **Trigger:** The question touches on medical advice, calorie targets, weight goals, or anything about what a person "should" weigh.
- **Behaviour:** The assistant declines to answer and directs the user to a qualified professional.
- **Enforcement:** This must be enforced programmatically (not just via prompt), consistent with the approach used in the previous week's work.

---

## 6. Explicit Out-of-Scope Items

The following are explicitly **excluded** from this milestone:

| Excluded | Reason |
|----------|--------|
| Nutrient databases (per-food calorie/macro data) | Handled in Milestone 3 via structured database |
| Medical advice | Out of scope by design — refer to professionals |
| Calorie or weight targets | Out of scope by design — refer to professionals |
| Sources with a structured API | This milestone is prose-only RAG |

---

## 7. Deliverables Summary

- [ ] **Corpus** — 5–7 official guidance documents with full metadata
- [ ] **Chunking pipeline** — with documented strategy and tradeoffs in README
- [ ] **Vector index** — supporting global and per-document filtered retrieval
- [ ] **RAG chatbot** — answers only from retrieved chunks, every claim cited
- [ ] **Cross-document handling** — separate per-source answers, no source blending
- [ ] **Two refusal types** — corpus gap refusal + out-of-scope refusal, enforced in code

---

## 8. Key Design Principles

1. **Retrieval-first, always.** The LLM is a formatter, not a knowledge source. All facts come from the corpus.
2. **Citation is non-negotiable.** Every claim must be traceable. No citation = no claim.
3. **Honest about limits.** The assistant never guesses or extrapolates. It says what it searched and what it didn't find.
4. **Source integrity.** Two documents can say different things. Preserve that difference — never reconcile or synthesise across sources.
5. **Safety by design.** Out-of-scope refusals are enforced in code, not just in the prompt.
