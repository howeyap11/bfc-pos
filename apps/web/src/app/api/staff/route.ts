// apps/web/src/app/api/staff/route.ts
import { NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/api-helpers";

// Staff list comes from POS backend (synced from Cloud Admin). No seeded fallback so
// register login never uses stale/hardcoded PINs when backend is unavailable.
export async function GET() {
  try {
    const backend = getBackendUrl();
    console.log("[Staff API] Fetching from:", `${backend}/staff`);

    const res = await fetch(`${backend}/staff`, {
      method: "GET",
      headers: { "content-type": "application/json" },
      cache: "no-store",
    });

    const text = await res.text();
    console.log("[Staff API] Response status:", res.status);
    console.log("[Staff API] Response preview:", text.slice(0, 120));

    if (!res.ok) {
      console.error("[Staff API] Backend error:", res.status, text.slice(0, 200));
      return NextResponse.json(
        { error: "Backend unavailable", staff: [] },
        { status: 503 }
      );
    }

    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data)) {
        console.error("[Staff API] Backend did not return an array");
        return NextResponse.json(
          { error: "Invalid staff response", staff: [] },
          { status: 502 }
        );
      }
      console.log("[Staff API] Success:", data.length, "staff members");
      return NextResponse.json(data);
    } catch (parseError) {
      console.error("[Staff API] JSON parse error:", parseError);
      console.error("[Staff API] Response was:", text.slice(0, 200));
      return NextResponse.json(
        { error: "Invalid response from backend", staff: [] },
        { status: 502 }
      );
    }
  } catch (error: any) {
    console.error("[Staff API] Fetch error:", error.message || error);
    return NextResponse.json(
      { error: "Cannot reach POS backend", staff: [] },
      { status: 503 }
    );
  }
}
