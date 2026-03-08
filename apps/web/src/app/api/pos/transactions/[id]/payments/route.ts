import { buildProxyHeaders, logProxyRequest } from "@/lib/proxyHelpers";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.text();
    
    logProxyRequest("POST /api/pos/transactions/:id/payments", req, {
      transactionId: params.id,
      bodyLength: body.length,
    });

    const upstream = await fetch(`http://127.0.0.1:3000/pos/transactions/${params.id}/payments`, {
      method: "POST",
      headers: buildProxyHeaders(req),
      body,
    });

    console.log("[API Route] Backend response", {
      ok: upstream.ok,
      status: upstream.status,
      statusText: upstream.statusText,
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
