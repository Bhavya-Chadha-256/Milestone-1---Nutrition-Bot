// lib/schema.ts
import { z } from "zod";

export const ClaimSchema = z.object({
  claim_text: z.string().min(1),
  source: z.null(),
});

export const ChatResponseSchema = z.object({
  answer: z.string().min(1),
  claims: z.array(ClaimSchema),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;
