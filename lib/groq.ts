// lib/groq.ts
// Phase 2 — Groq API client with JSON-mode structured output

import Groq from "groq-sdk";
import { ChatResponseSchema, type ChatResponse } from "./schema";
import { SYSTEM_PROMPT } from "./systemPrompt";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Primary model. Fallback: "qwen/qwen3-27b"
const MODEL = "openai/gpt-oss-120b";

// Appended to system prompt — reinforces exact JSON shape
const FORMAT_REMINDER = `

REMINDER — your entire response must be a single valid JSON object with exactly
these keys: "answer" (string) and "claims" (array of {claim_text: string, source: null}).
Do not wrap it in markdown. Do not add any text before or after the JSON.`;

export async function callModel(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string
): Promise<ChatResponse> {
  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 1024,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT + FORMAT_REMINDER,
      },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: userMessage },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "";

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `MODEL_PARSE_ERROR: Response was not valid JSON — "${raw.slice(0, 300)}"`
    );
  }

  // Validate shape
  const validated = ChatResponseSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(
      `MODEL_PARSE_ERROR: Schema mismatch — ${validated.error.message}`
    );
  }

  return validated.data;
}
