import { getBackendUrl } from "@/lib/api-helpers";

export async function GET() {
  const res = await fetch(`${getBackendUrl()}/snapresibo/vouchers/count`, { cache: "no-store" });
  const data = await res.json();
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { "content-type": "application/json" },
  });
}
