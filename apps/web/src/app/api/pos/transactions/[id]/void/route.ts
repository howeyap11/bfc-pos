export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.text();
    
    // Pass through x-staff-key from client request
    const staffKey = req.headers.get("x-staff-key") ?? "";

    const upstream = await fetch(`http://127.0.0.1:3000/pos/transactions/${params.id}/void`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-staff-key": staffKey,
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
