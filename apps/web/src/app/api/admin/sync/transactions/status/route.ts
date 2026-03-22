import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/api-helpers";
import { buildProxyHeaders, logProxyRequest } from "@/lib/proxyHelpers";

export async function GET(req: NextRequest) {
  try {
    logProxyRequest("GET /api/admin/sync/transactions/status", req);
    const upstream = await fetch(`${getBackendUrl()}/admin/sync/transactions/status`, {
      method: "GET",
      headers: buildProxyHeaders(req),
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
