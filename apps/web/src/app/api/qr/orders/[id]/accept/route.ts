// apps/web/src/app/api/qr/orders/[id]/accept/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
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
