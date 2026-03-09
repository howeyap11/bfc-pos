import { getBackendUrl } from "@/lib/api-helpers";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    
    // Pass through x-staff-key from client request
    const staffKey = req.headers.get("x-staff-key") ?? "";

    const upstream = await fetch(`${getBackendUrl()}/register/close`, {
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
