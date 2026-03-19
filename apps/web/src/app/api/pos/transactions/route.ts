import { buildProxyHeaders, logProxyRequest } from "@/lib/proxyHelpers";
import { getBackendUrl } from "@/lib/api-helpers";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    
    logProxyRequest("POST /api/pos/transactions", req);

    const upstream = await fetch(`${getBackendUrl()}/pos/transactions`, {
      method: "POST",
      headers: buildProxyHeaders(req),
      body,
    });

    const text = await upstream.text();
    
    if (!upstream.ok) {
      let parsed: { code?: string; step?: string; message?: string } | null = null;
      try {
        parsed = JSON.parse(text) as { code?: string; step?: string; message?: string };
      } catch {
        parsed = null;
      }
      console.error("[createTransaction] Backend error", {
        status: upstream.status,
        code: parsed?.code ?? "unknown",
        step: parsed?.step,
        message: parsed?.message,
        bodyPreview: text.slice(0, 300),
      });
    }
    
    return new Response(text, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch (e: any) {
    console.error("[API Route] Proxy exception", e);
    return new Response(JSON.stringify({ error: "Proxy failed", message: e?.message ?? String(e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
