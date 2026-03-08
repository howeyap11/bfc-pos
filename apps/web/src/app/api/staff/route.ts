// apps/web/src/app/api/staff/route.ts
import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Default fallback staff list for development (includes passcode and key for local validation)
const DEFAULT_STAFF = [
  { id: "default_1", name: "Andrea", role: "ADMIN", passcode: "1000", key: "staff_9ev8p6ej388lku308p3vc", isActive: true },
  { id: "default_2", name: "John", role: "CASHIER", passcode: "1001", key: "staff_idglcga7ccsb73maez1km", isActive: true },
  { id: "default_3", name: "Maria", role: "CASHIER", passcode: "1002", key: "staff_fqv6bxdtcmjuqu3kfgncm", isActive: true },
];

export async function GET() {
  try {
    console.log("[Staff API] Fetching from:", `${API_BASE}/staff`);
    
    const res = await fetch(`${API_BASE}/staff`, {
      method: "GET",
      headers: { "content-type": "application/json" },
      cache: "no-store",
    });

    // Read as text first to handle non-JSON responses
    const text = await res.text();
    console.log("[Staff API] Response status:", res.status);
    console.log("[Staff API] Response preview:", text.slice(0, 120));

    if (!res.ok) {
      console.error("[Staff API] Backend error:", res.status, text.slice(0, 200));
      
      // Return default staff list if backend is unavailable
      console.warn("[Staff API] Using default staff list");
      return NextResponse.json(DEFAULT_STAFF);
    }

    // Try to parse JSON
    try {
      const data = JSON.parse(text);
      console.log("[Staff API] Success:", data.length, "staff members");
      return NextResponse.json(data);
    } catch (parseError) {
      console.error("[Staff API] JSON parse error:", parseError);
      console.error("[Staff API] Response was:", text.slice(0, 200));
      
      // Return default staff list on parse error
      console.warn("[Staff API] Using default staff list due to parse error");
      return NextResponse.json(DEFAULT_STAFF);
    }
  } catch (error: any) {
    console.error("[Staff API] Fetch error:", error.message || error);
    
    // Return default staff list on network error
    console.warn("[Staff API] Using default staff list due to network error");
    return NextResponse.json(DEFAULT_STAFF);
  }
}
