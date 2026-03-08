import { proxyToBackend } from "@/lib/api-helpers";

/**
 * Health check endpoint
 * 
 * Checks both Next.js web server and Fastify backend
 * 
 * Returns:
 * - 200 { web: "ok", backend: "ok" } if both are healthy
 * - 500 with detailed error if backend is unreachable
 */
export async function GET() {
  try {
    const backendResponse = await proxyToBackend("/health");
    const backendText = await backendResponse.text();
    
    if (backendResponse.ok) {
      // Backend is healthy
      return new Response(
        JSON.stringify({
          web: "ok",
          backend: "ok",
          backendResponse: JSON.parse(backendText),
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      );
    } else {
      // Backend returned non-200
      return new Response(
        JSON.stringify({
          web: "ok",
          backend: "error",
          backendStatus: backendResponse.status,
          backendResponse: backendText,
        }),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        }
      );
    }
  } catch (e: any) {
    // Backend unreachable or proxy error
    return new Response(
      JSON.stringify({
        web: "ok",
        backend: "unreachable",
        error: e?.message || String(e),
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      }
    );
  }
}
