export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const area = url.searchParams.get("area") ?? "";

    const upstream = await fetch(`http://127.0.0.1:3000/queue?area=${area}`, {
      cache: "no-store",
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
