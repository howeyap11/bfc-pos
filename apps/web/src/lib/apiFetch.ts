/**
 * Shared API fetch helper that logs detailed error information on failures.
 * Prevents silent failures by always logging status + raw body on non-2xx responses.
 * 
 * Custom error codes:
 * - INVALID_STAFF_KEY: 401 response with "Invalid staff key" message (requires re-authentication)
 * - MISSING_STAFF_KEY: 401 response with "Missing x-staff-key" message (no header sent)
 */

export class InvalidStaffKeyError extends Error {
  code = "INVALID_STAFF_KEY";
  constructor(message: string) {
    super(message);
    this.name = "InvalidStaffKeyError";
  }
}

export class MissingStaffKeyError extends Error {
  code = "MISSING_STAFF_KEY";
  constructor(message: string) {
    super(message);
    this.name = "MissingStaffKeyError";
  }
}

export async function apiFetch(path: string, init?: RequestInit) {
  // Debug logging for staff key - handle both Headers instance and plain object
  let staffKeyHeader: string | null = null;
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      staffKeyHeader = init.headers.get("x-staff-key");
    } else {
      staffKeyHeader = (init.headers as any)["x-staff-key"] || null;
    }
  }
  
  console.log("[apiFetch] DEBUG", {
    path,
    hasStaffKeyHeader: !!staffKeyHeader,
    staffKeyPreview: staffKeyHeader ? `${staffKeyHeader.slice(0, 6)}...` : "NONE",
    headersType: init?.headers ? (init.headers instanceof Headers ? "Headers" : "Object") : "none",
    allHeaders: init?.headers instanceof Headers ? Object.fromEntries(init.headers.entries()) : init?.headers,
  });

  const res = await fetch(path, init);
  const raw = await res.text();
  const contentType = res.headers.get("content-type") ?? "";
  let data: any = null;

  if (raw && contentType.includes("application/json")) {
    try { 
      data = JSON.parse(raw); 
    } catch { 
      data = null; 
    }
  }

  if (!res.ok) {
    console.error("[API] FAILED", {
      path,
      status: res.status,
      statusText: res.statusText,
      contentType,
      rawPreview: raw.slice(0, 400),
      rawText: raw,
      parsedData: data,
    });

    // Handle 401 errors with specific staff key issues
    if (res.status === 401) {
      const msg = (data?.message ?? raw ?? "").toLowerCase();
      
      // Missing header
      if (msg.includes("missing x-staff-key")) {
        throw new MissingStaffKeyError("No staff authentication header sent");
      }
      
      // Invalid key
      if (msg.includes("invalid staff key")) {
        throw new InvalidStaffKeyError("Staff authentication invalid or expired");
      }
    }
  }

  return { res, raw, data };
}
