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

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id: incomingSessionId, message } = body as {
      session_id?: string | null;
      message?: unknown;
    };

    // ── Runtime Vercel Proxy Bypass ─────────────────────────
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;
    if (backendUrl) {
      const renderRes = await fetch(`${backendUrl.replace(/\/$/, "")}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await renderRes.json();
      return NextResponse.json(data, { status: renderRes.status, headers: CORS_HEADERS });
    }

    // Validate input
    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Missing message" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // ── Phase 3: Scope guard ────────────────────────────────
    // Runs before any model call — returns in <1ms
    if (isBlocked(message)) {
      const sessionId =
        incomingSessionId && sessionExists(incomingSessionId)
          ? incomingSessionId
          : createSession();
      return NextResponse.json(
        { session_id: sessionId, ...DECLINE_RESPONSE },
        { headers: CORS_HEADERS }
      );
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

    return NextResponse.json(
      { session_id: sessionId, ...result },
      { headers: CORS_HEADERS }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.startsWith("MODEL_PARSE_ERROR")) {
      return NextResponse.json(
        { error: msg },
        { status: 500, headers: CORS_HEADERS }
      );
    }
    console.error("[/api/chat]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
