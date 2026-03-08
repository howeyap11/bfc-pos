// apps/web/src/lib/api-helpers.ts

/**
 * Safe fetch helper with detailed error diagnostics
 * 
 * Returns parsed JSON on success, or throws error with detailed diagnostics on failure
 */
export async function fetchWithDiagnostics(url: string, init?: RequestInit) {
  const method = init?.method || "GET";
  
  try {
    const res = await fetch(url, init);
    const text = await res.text();
    const contentType = res.headers.get("content-type");

    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      // Not valid JSON - return diagnostic error
      throw {
        error: "Backend returned invalid response",
        backendUrl: url,
        method,
        status: res.status,
        contentType,
        bodyPreview: text.slice(0, 300),
      };
    }

    // Check response status
    if (!res.ok) {
      // Backend returned JSON error
      throw {
        error: "Backend request failed",
        backendUrl: url,
        method,
        status: res.status,
        contentType,
        backendError: data,
      };
    }

    return data;
  } catch (error: any) {
    // Network error or our thrown diagnostic error
    if (error.backendUrl) {
      // Already a diagnostic error, re-throw
      throw error;
    }
    
    // Network/connection error
    throw {
      error: "Backend unreachable",
      backendUrl: url,
      method,
      networkError: error.message || String(error),
    };
  }
}

/**
 * Format diagnostic error for user display
 */
export function formatDiagnosticError(error: any): string {
  if (error.backendUrl) {
    if (error.bodyPreview) {
      return `Backend returned HTML/invalid response (${error.status}). Is the API server running?`;
    }
    if (error.networkError) {
      return `Cannot reach backend at ${error.backendUrl}. Is the API server running?`;
    }
    if (error.backendError) {
      return error.backendError.error || `Backend error (${error.status})`;
    }
  }
  
  return error.message || String(error);
}

/**
 * Get backend API base URL from environment
 * Defaults to 127.0.0.1:3000 (NOT localhost to avoid DNS issues)
 * IMPORTANT: Fastify runs on port 3000 by default
 */
export function getBackendUrl(): string {
  return process.env.POS_API_BASE_URL || "http://127.0.0.1:3000";
}

/**
 * Server-side proxy helper for Next.js API routes
 * 
 * Proxies requests to Fastify backend with detailed error diagnostics
 * 
 * @param path - Backend path (e.g., "/menu", "/items/123")
 * @param init - Fetch options (method, headers, body, etc.)
 * @returns Response object to return from Next.js route handler
 */
export async function proxyToBackend(path: string, init?: RequestInit): Promise<Response> {
  const backendBase = getBackendUrl();
  const backendUrl = new URL(path, backendBase).toString();
  const method = init?.method || "GET";

  try {
    const upstream = await fetch(backendUrl, {
      ...init,
      cache: "no-store",
    });

    const text = await upstream.text();

    return new Response(text, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (e: any) {
    // Detailed error diagnostics
    const errorResponse = {
      error: "Proxy failed",
      backendUrl,
      method,
      cause: `${e?.name || "Error"}: ${e?.message || String(e)}`,
      hint: "Is Fastify running on the expected port? Check POS_API_BASE_URL env var.",
      timestamp: new Date().toISOString(),
    };

    // Log to server console for debugging
    console.error("[Proxy Error]", errorResponse, e?.stack);

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
