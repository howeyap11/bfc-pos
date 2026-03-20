import { getBackendUrl } from "@/lib/api-helpers";

function getStaffKey(req: Request): string | null {
  const key = req.headers.get("x-staff-key");
  return key?.trim() || null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const selectedDate = url.searchParams.get("selectedDate") ?? "";

    const staffKey = getStaffKey(req);
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (staffKey) headers["x-staff-key"] = staffKey;

    const upstream = await fetch(
      `${getBackendUrl()}/pos/transactions/summary?selectedDate=${encodeURIComponent(selectedDate)}`,
      { cache: "no-store", headers }
    );

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Summary proxy failed";
    return new Response(JSON.stringify({ error: "Proxy failed", message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
