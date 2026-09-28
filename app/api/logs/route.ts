import { NextResponse } from "next/server";
import { getFailureLogs } from "@/lib/db";

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
    const logs = getFailureLogs();
    return NextResponse.json({ logs }, { headers: CORS_HEADERS });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
