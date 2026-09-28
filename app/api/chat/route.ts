// app/api/chat/route.ts
// Phase 2 — POST /api/chat route handler

import { NextRequest, NextResponse } from "next/server";
import { callModel } from "@/lib/groq";

export const dynamic = "force-dynamic";
import { isBlocked } from "@/lib/scopeGuard";
import { createSession, sessionExists, getHistory, saveMessages } from "@/lib/db";

const DECLINE_RESPONSE = {
  answer:
    "I'm not able to provide calorie targets, weight recommendations, or medical advice. " +
    "Please consult a registered dietitian or your doctor for personalised guidance.",
  claims: [],
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id: incomingSessionId, message } = body as {
      session_id?: string | null;
      message?: unknown;
    };

    // Validate input
    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    // ── Phase 3: Scope guard ────────────────────────────────
    // Runs before any model call — returns in <1ms
    if (isBlocked(message)) {
      const sessionId =
        incomingSessionId && sessionExists(incomingSessionId)
          ? incomingSessionId
          : createSession();
      return NextResponse.json({ session_id: sessionId, ...DECLINE_RESPONSE });
    }

    // ── Session resolution ──────────────────────────────────
    const sessionId =
      incomingSessionId && sessionExists(incomingSessionId)
        ? incomingSessionId
        : createSession();

    // ── History ─────────────────────────────────────────────
    const rawHistory = getHistory(sessionId);
    const history = rawHistory.map((m) => {
      const content = JSON.parse(m.content) as Record<string, string>;
      return {
        role: m.role as "user" | "assistant",
        content: m.role === "user" ? content.text : content.answer,
      };
    });

    // ── Model call ──────────────────────────────────────────
    const result = await callModel(history, message);

    // ── Persist (sync) ──────────────────────────────────────
    saveMessages(sessionId, message, result);

    return NextResponse.json({ session_id: sessionId, ...result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.startsWith("MODEL_PARSE_ERROR")) {
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    console.error("[/api/chat]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
