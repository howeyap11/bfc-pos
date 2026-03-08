import { proxyToBackend } from "@/lib/api-helpers";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  return proxyToBackend(`/items/${params.id}`);
}
