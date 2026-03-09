import { buildProxyHeaders, logProxyRequest } from "@/lib/proxyHelpers";
import { getBackendUrl } from "@/lib/api-helpers";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.text();
    
    logProxyRequest("POST /api/pos/transactions/:id/payments", req, {
      transactionId: id,
      bodyLength: body.length,
    });

    const upstream = await fetch(`${getBackendUrl()}/pos/transactions/${id}/payments`, {
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
