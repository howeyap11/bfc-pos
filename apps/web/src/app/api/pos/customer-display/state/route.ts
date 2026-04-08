import { buildProxyHeaders, logProxyRequest } from "@/lib/proxyHelpers";
import { getBackendUrl } from "@/lib/api-helpers";

export async function GET(req: Request) {
  try {
    logProxyRequest("GET /api/pos/customer-display/state", req);
    const upstream = await fetch(`${getBackendUrl()}/pos/customer-display/state`, {
      cache: "no-store",
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "Proxy failed", message: e?.message ?? String(e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

export async function POST(req: Request) {
  try {
    logProxyRequest("POST /api/pos/customer-display/state", req);
    const body = await req.text();
    const upstream = await fetch(`${getBackendUrl()}/pos/customer-display/state`, {
      method: "POST",
      headers: buildProxyHeaders(req),
      body,
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "Proxy failed", message: e?.message ?? String(e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
