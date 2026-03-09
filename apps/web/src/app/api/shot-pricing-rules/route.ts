import { proxyToBackend } from "@/lib/api-helpers";

export async function GET() {
  return proxyToBackend("/shot-pricing-rules");
}
