// apps/web/src/app/api/staff/login/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log("[Staff Login API] Attempting login for staffId:", body.staffId);

    const res = await fetch(`${API_BASE}/staff/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    // Read as text first to handle non-JSON responses
    const text = await res.text();
    console.log("[Staff Login API] Response status:", res.status);
    console.log("[Staff Login API] Response preview:", text.slice(0, 120));

    // Try to parse JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error("[Staff Login API] JSON parse error:", parseError);
      console.error("[Staff Login API] Response was:", text.slice(0, 200));
      
      // Return detailed diagnostic error
      return NextResponse.json({
        error: "Backend returned invalid response",
        backendUrl: `${API_BASE}/staff/login`,
        method: "POST",
        status: res.status,
        contentType: res.headers.get("content-type"),
        bodyPreview: text.slice(0, 300),
      }, { status: 500 });
    }

    if (!res.ok) {
      console.log("[Staff Login API] Login failed:", data.error);
      return NextResponse.json(data, { status: res.status });
    }

    console.log("[Staff Login API] Login successful for:", data.name);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Staff Login API] Unexpected error:", error.message || error);
    return NextResponse.json({ error: error.message || "Failed to login" }, { status: 500 });
  }
}
