// apps/web/src/app/api/qr/orders/[id]/accept/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.POS_API_BASE_URL || "http://127.0.0.1:4000";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Pass through x-staff-key from client request
    const staffKey = req.headers.get("x-staff-key") ?? "";

    const res = await fetch(`${API_BASE}/qr/orders/${id}/accept`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-staff-key": staffKey,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to accept order" }, { status: 500 });
  }
}
