import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.POS_API_BASE_URL || "http://127.0.0.1:4000";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const staffKey = req.headers.get("x-staff-key") ?? "";
    const body = await req.json().catch(() => ({}));
    const reason = (body.reason as string)?.trim() || "Declined by staff";

    const res = await fetch(`${API_BASE}/orders/${id}/cancel`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-staff-key": staffKey,
      },
      body: JSON.stringify({ reason }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to decline order" }, { status: 500 });
  }
}
