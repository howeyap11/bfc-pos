export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    
    // Pass through x-staff-key from client request
    const staffKey = req.headers.get("x-staff-key") ?? "";

    const upstream = await fetch(`http://127.0.0.1:3000/sop/completions?${url.searchParams}`, {
      cache: "no-store",
      headers: { "x-staff-key": staffKey },
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

export async function POST(req: Request) {
  try {
    // Pass through x-staff-key from client request
    const staffKey = req.headers.get("x-staff-key") ?? "";
    const formData = await req.formData();

    const upstream = await fetch("http://127.0.0.1:3000/sop/completions", {
      method: "POST",
      headers: { "x-staff-key": staffKey },
      body: formData,
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
