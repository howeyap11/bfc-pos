import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/api-helpers";
import { buildProxyHeaders, logProxyRequest } from "@/lib/proxyHelpers";

export async function POST(req: NextRequest) {
  try {
    logProxyRequest("POST /api/admin/sync/transactions/backfill", req);
    const upstream = await fetch(`${getBackendUrl()}/admin/sync/transactions/backfill`, {
      method: "POST",
      headers: buildProxyHeaders(req),
      body: "{}",
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Proxy failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
