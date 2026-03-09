import { getBackendUrl } from "@/lib/api-helpers";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.text();
    
    const staffKey = req.headers.get("x-staff-key") ?? "";

    const upstream = await fetch(`${getBackendUrl()}/pos/transactions/${id}/void`, {
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
