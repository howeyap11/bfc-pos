import { buildProxyHeaders, logProxyRequest } from "@/lib/proxyHelpers";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    
    logProxyRequest("POST /api/pos/transactions", req);

    const upstream = await fetch(`http://127.0.0.1:3000/pos/transactions`, {
      method: "POST",
      headers: buildProxyHeaders(req),
      body,
    });

    const text = await upstream.text();
    
    if (!upstream.ok) {
      console.error("[API Route] Backend error", {
        status: upstream.status,
        body: text.slice(0, 500),
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
