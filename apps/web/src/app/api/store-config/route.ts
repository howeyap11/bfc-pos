// apps/web/src/app/api/store-config/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Default fallback config
const DEFAULT_CONFIG = {
  storeId: "store_1",
  enabledPaymentMethods: ["CASH", "CARD", "GCASH", "FOODPANDA"],
  splitPaymentEnabled: true,
  paymentMethodOrder: null,
};

export async function GET(req: NextRequest) {
  try {
    console.log("[API /store-config] Fetching from backend:", `${API_BASE}/store-config`);
    
    const res = await fetch(`${API_BASE}/store-config`, {
      method: "GET",
      headers: {
        "content-type": "application/json",
      },
      cache: "no-store",
    });

    const text = await res.text();
    console.log("[API /store-config] Backend response status:", res.status);
    console.log("[API /store-config] Backend response (first 200 chars):", text.slice(0, 200));

    // Try to parse JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error("[API /store-config] JSON parse error:", parseError);
      console.error("[API /store-config] Response was not JSON, returning default config");
      return NextResponse.json(DEFAULT_CONFIG);
    }

    if (!res.ok) {
      console.warn("[API /store-config] Backend returned error, using default config");
      return NextResponse.json(DEFAULT_CONFIG);
    }

    console.log("[API /store-config] Success, returning data:", data);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[API /store-config] Fetch error:", error.message || error);
    console.log("[API /store-config] Returning default config due to error");
    return NextResponse.json(DEFAULT_CONFIG);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Pass through x-staff-key from client request
    const staffKey = req.headers.get("x-staff-key") ?? "";

    const res = await fetch(`${API_BASE}/store-config`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-staff-key": staffKey,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update store config" }, { status: 500 });
  }
}
