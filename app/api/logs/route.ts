import { NextResponse } from "next/server";
import { getFailureLogs } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const logs = getFailureLogs();
    return NextResponse.json({ logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
