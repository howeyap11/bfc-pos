import { getBackendUrl } from "@/lib/api-helpers";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const staffKey = req.headers.get("x-staff-key") ?? "";

    const upstream = await fetch(`${getBackendUrl()}/pos/transactions/${id}/kds-bump`, {
      method: "PATCH",
      headers: { "x-staff-key": staffKey },
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
