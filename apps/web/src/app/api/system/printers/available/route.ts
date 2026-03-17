import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/api-helpers";

function getStaffKey(req: NextRequest): string | null {
  const key = req.headers.get("x-staff-key");
  return key?.trim() || null;
}

export async function GET(req: NextRequest) {
  try {
    const staffKey = getStaffKey(req);
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (staffKey) headers["x-staff-key"] = staffKey;

    const res = await fetch(`${getBackendUrl()}/system/printers/available`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to load printers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
