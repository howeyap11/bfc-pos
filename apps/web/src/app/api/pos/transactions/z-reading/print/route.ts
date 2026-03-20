import { buildProxyHeaders, logProxyRequest } from "@/lib/proxyHelpers";
import { getBackendUrl } from "@/lib/api-helpers";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    logProxyRequest("POST /api/pos/transactions/z-reading/print", req);

    const upstream = await fetch(`${getBackendUrl()}/pos/transactions/z-reading/print`, {
      method: "POST",
      headers: {
        ...buildProxyHeaders(req),
        "content-type": "application/json",
      },
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
