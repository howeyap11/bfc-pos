export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.text();

    const upstream = await fetch(`http://127.0.0.1:3000/orders/${params.id}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
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
