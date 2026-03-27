import { getBackendUrl } from "@/lib/api-helpers";

function buildHeaders(req: Request): Headers {
  const headers = new Headers();
  const staffKey = req.headers.get("x-staff-key");
  if (staffKey) headers.set("x-staff-key", staffKey);
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  return headers;
}

async function proxy(req: Request, ctx: { params: Promise<{ path: string[] }> }, method: string) {
  const { path } = await ctx.params;
  const backendPath = `/${path.join("/")}`;
  const upstream = await fetch(`${getBackendUrl()}${backendPath}`, {
    method,
    headers: buildHeaders(req),
    body: method === "GET" ? undefined : await req.arrayBuffer(),
    cache: "no-store",
  });
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx, "GET");
}

export async function POST(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, ctx, "POST");
}
