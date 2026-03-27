import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/api-helpers";

function toBackendPath(parts: string[]): string {
  return `/${parts.join("/")}`;
}

async function proxy(req: NextRequest, method: string, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const backendUrl = `${getBackendUrl()}${toBackendPath(path)}`;
  const staffKey = req.headers.get("x-staff-key") ?? "";
  const contentType = req.headers.get("content-type");

  const init: RequestInit = {
    method,
    headers: {
      ...(contentType ? { "content-type": contentType } : {}),
      ...(staffKey ? { "x-staff-key": staffKey } : {}),
    },
    cache: "no-store",
  };
  if (method !== "GET" && method !== "HEAD") {
    init.body = await req.text();
  }

  const upstream = await fetch(backendUrl, init);
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, "GET", ctx);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxy(req, "POST", ctx);
}
