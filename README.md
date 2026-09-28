# Milestone 1: Nutrition Bot

This project is a specialized nutrition information assistant built for Milestone 1. It acts as an interactive chat bot capable of answering complex nutrition and food safety queries while enforcing strict safety scope limits and structuring responses with exact factual claims extraction.

## 1. System Prompt

The core behavior of the AI is driven by the following system prompt:

```text
You are a nutrition information assistant. You answer questions about food,
nutrition, and food safety only.

How you answer:
- Be factual and specific.
- Keep answers between 2 and 5 sentences unless a list is clearly better.
- Break complex answers into short bullet points.
- Never invent authority names, studies, or publications.
- If uncertain, say explicitly: "This is not well established" rather than hedging vaguely.

What you will not do:
- Provide calorie targets, deficits, or surpluses for any individual.
- Recommend how much a person should weigh or how to change their weight.
- Give medical advice, diagnose conditions, or suggest treatments or dosages.

If asked for any of the above, say:
"I'm not able to provide [X]. Please consult a registered dietitian or your doctor."

Response format — CRITICAL:
You must respond with a valid JSON object ONLY. No markdown, no prose outside the JSON, no code fences.
The JSON must exactly match this shape:
{
  "answer": "<plain prose response, 2-5 sentences>",
  "claims": [
    { "claim_text": "<one factual statement>", "source": null }
  ]
}
One fact per claim. Do not bundle multiple facts into one claim.
Every claim's "source" field must be null (not a string, not omitted — exactly null).
```

## 2. Response Schema

To ensure strict integration with our database and UI components, the model must output JSON corresponding to this Zod schema:

```typescript
import { z } from "zod";

export const ClaimSchema = z.object({
  claim_text: z.string().min(1),
  source: z.null(),
});

export const ChatResponseSchema = z.object({
  answer: z.string().min(1),
  claims: z.array(ClaimSchema),
});
```
This forces the model to separate the prose response (`answer`) from atomic factual statements (`claims`).

## 3. Prompt Versions & Iteration History

Across the development process, the prompt evolved significantly to achieve the final reliable state:

*   **Version 1 (Initial Chatbot):** A basic prompt instructing the model to act as a nutrition bot. *Issue:* It was too verbose, frequently hallucinated study names to sound authoritative, and freely gave medical advice.
*   **Version 2 (Safety Guardrails):** Added explicit negative constraints ("What you will not do") and the exact rejection phrase to use when probed for weight loss or dosages. *Issue:* The model would still occasionally hedge with "I'm not a doctor but..." instead of the strict required rejection.
*   **Version 3 (Structured Extraction):** Introduced the JSON format requirement to extract `claims`. *Issue:* The model would often wrap the JSON in markdown blocks or bundle multiple distinct facts into a single `claim_text`.
*   **Version 4 (Final Polish):** Added the `FORMAT_REMINDER` payload appended dynamically to the end of the context window. It uses strict instructions ("No markdown, no prose outside the JSON") and defines exactly what a claim is ("One fact per claim"). We also forced the `source` field to strictly be `null` to prep for Phase 2 data linking.

## 4. Scope Limit Enforcement

Rather than relying entirely on the LLM to govern itself (which is slow and sometimes bypassable via prompt injection), the scope limit is enforced via a **Synchronous Pre-flight Regex Guard** (`lib/scopeGuard.ts`).

Before the API even constructs a payload for the Groq model, the user's input is scanned against an array of robust regex patterns (e.g., `/\bcalorie\s*(target|goal|limit|intake)\b/i`, `/\blose\s+weight\b/i`, `/\bdiagnos(e|is)\b/i`). 

If a blocked pattern is detected, the API instantly (<1ms) short-circuits the request and returns the standard medical/calorie rejection response. This saves API costs, reduces latency, and provides a foolproof deterministic safety layer.

## 5. Tech Stack

*   **Framework:** Next.js (App Router, Serverless API Routes)
*   **Frontend:** React, Tailwind CSS (Custom Dark Mode & Glassmorphism UI)
*   **Backend Database:** SQLite (`better-sqlite3`) — attached to a persistent disk on Render for long-term global logging.
*   **LLM Inference:** Groq SDK utilizing Llama/Qwen models for ultra-low latency JSON-mode generation.
*   **Validation:** Zod for strict runtime schema validation of LLM outputs.
*   **Deployment Architecture:** Dual-deployment setup. Frontend hosted on Vercel (Global Edge CDN) with Next.js API rewrites pointing to a stateful Render backend (Node.js + Persistent Disk).
