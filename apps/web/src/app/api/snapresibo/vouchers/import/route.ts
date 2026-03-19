import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/api-helpers";
import { buildProxyHeaders } from "@/lib/proxyHelpers";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${getBackendUrl()}/snapresibo/vouchers/import`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...buildProxyHeaders(req),
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: "Import failed", message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
