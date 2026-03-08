import { buildProxyHeaders, logProxyRequest } from "@/lib/proxyHelpers";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    logProxyRequest("GET /api/pos/transactions/:id/receipt", req, { transactionId: params.id });

    const upstream = await fetch(`http://127.0.0.1:3000/pos/transactions/${params.id}/receipt`, {
      cache: "no-store",
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
