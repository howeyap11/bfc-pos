import { getBackendUrl } from "@/lib/api-helpers";

export async function PATCH(req: Request) {
  try {
    const body = await req.text();
    const upstream = await fetch(`${getBackendUrl()}/store-config/tablet-nav`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body,
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
