import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log("[Admin Verify API] Verifying admin PIN");

    const res = await fetch(`${API_BASE}/staff/verify-admin-pin`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    console.log("[Admin Verify API] Response status:", res.status);

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error("[Admin Verify API] JSON parse error:", parseError);
      return NextResponse.json({
        error: "Backend returned invalid response",
        status: res.status,
      }, { status: 500 });
    }

    if (!res.ok) {
      console.log("[Admin Verify API] Verification failed:", data.error);
      return NextResponse.json(data, { status: res.status });
    }

    console.log("[Admin Verify API] Admin verified:", data.name);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Admin Verify API] Unexpected error:", error.message || error);
    return NextResponse.json({ error: error.message || "Failed to verify admin" }, { status: 500 });
  }
}
