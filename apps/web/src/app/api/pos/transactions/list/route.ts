import { getBackendUrl } from "@/lib/api-helpers";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = url.searchParams.get("limit") || "30";
    const cursor = url.searchParams.get("cursor") ?? "";
    const selectedDate = url.searchParams.get("selectedDate") ?? "";

    // Pass through x-staff-key from client request
    const staffKey = req.headers.get("x-staff-key") ?? "";

    const params = new URLSearchParams({ limit });
    if (cursor) params.set("cursor", cursor);
    if (selectedDate) params.set("selectedDate", selectedDate);
    const upstream = await fetch(`${getBackendUrl()}/pos/transactions/list?${params}`, {
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
