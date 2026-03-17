import { buildProxyHeaders, logProxyRequest } from "@/lib/proxyHelpers";
import { getBackendUrl } from "@/lib/api-helpers";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    logProxyRequest("POST /api/pos/transactions/:id/print-stickers", req, { transactionId: id });

    const upstream = await fetch(`${getBackendUrl()}/pos/transactions/${id}/print-stickers`, {
      method: "POST",
      headers: buildProxyHeaders(req),
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
