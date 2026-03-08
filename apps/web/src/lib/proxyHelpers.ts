/**
 * Shared helpers for Next.js API route proxying to Fastify backend
 */

/**
 * Builds headers for proxying to Fastify, conditionally including x-staff-key
 * @param req - Incoming Next.js Request
 * @param additionalHeaders - Any additional headers to include
 * @returns Headers object with x-staff-key only if present in incoming request
 */
export function buildProxyHeaders(
  req: Request,
  additionalHeaders?: Record<string, string>
): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...additionalHeaders,
  };

  // Only include x-staff-key if present in incoming request
  const staffKey = req.headers.get("x-staff-key");
  if (staffKey) {
    headers["x-staff-key"] = staffKey;
  }

  return headers;
}

/**
 * Logs proxy request details for debugging
 */
export function logProxyRequest(
  route: string,
  req: Request,
  additionalInfo?: Record<string, any>
) {
  const staffKey = req.headers.get("x-staff-key");
  console.log(`[API Proxy] ${route}`, {
    hasStaffKey: !!staffKey,
    staffKeyLength: staffKey?.length || 0,
    staffKeyPreview: staffKey ? staffKey.slice(0, 10) + "..." : "NONE",
    ...additionalInfo,
  });
}
