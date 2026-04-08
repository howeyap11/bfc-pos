import { buildProxyHeaders, logProxyRequest } from "@/lib/proxyHelpers";
import { getBackendUrl } from "@/lib/api-helpers";

export async function GET(req: Request) {
  try {
    logProxyRequest("GET /api/pos/catalog-categories", req);
    const upstream = await fetch(`${getBackendUrl()}/pos/catalog-categories`, {
      cache: "no-store",
      headers: buildProxyHeaders(req),
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: "Proxy failed", message: msg }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
