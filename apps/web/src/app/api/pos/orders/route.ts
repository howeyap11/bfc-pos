export async function GET(req: Request) {
  try {
    const staffKey = req.headers.get("x-staff-key") ?? "";
    const url = new URL(req.url);
    const tab = url.searchParams.get("tab") ?? "qr";

    const backendBase = process.env.POS_API_BASE_URL || "http://127.0.0.1:4000";
    const backendUrl = `${backendBase}/pos/orders?tab=${tab}`;

    const upstream = await fetch(backendUrl, {
      cache: "no-store",
      headers: { "x-staff-key": staffKey },
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: "Proxy failed", message: e?.message ?? String(e) }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
