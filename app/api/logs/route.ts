import { NextResponse } from "next/server";
import { getAllQueries } from "@/lib/db";

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}

export async function GET() {
  try {
    // ── Runtime Vercel Proxy Bypass ─────────────────────────
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;
    if (backendUrl) {
      const renderRes = await fetch(`${backendUrl.replace(/\/$/, "")}/api/logs`, {
        method: "GET",
      });
      const data = await renderRes.json();
      return NextResponse.json(data, { status: renderRes.status, headers: CORS_HEADERS });
    }

    const logs = getAllQueries();
    return NextResponse.json({ logs }, { headers: CORS_HEADERS });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
