import { buildProxyHeaders, logProxyRequest } from "@/lib/proxyHelpers";
import { getBackendUrl } from "@/lib/api-helpers";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    logProxyRequest("POST /api/pos/transactions/:id/print-order-slip", req, { transactionId: id });
    const bodyText = await req.text();
    const upstream = await fetch(`${getBackendUrl()}/pos/transactions/${id}/print-order-slip`, {
      method: "POST",
      headers: buildProxyHeaders(req),
      body: bodyText || "{}",
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
