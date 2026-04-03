export type CloudAdminRole = "ADMIN" | "MANAGER";

export function getCloudAdminRoleFromToken(): CloudAdminRole {
  if (typeof window === "undefined") return "ADMIN";
  const token = localStorage.getItem("cloud_token");
  if (!token) return "ADMIN";
  try {
    const parts = token.split(".");
    if (parts.length < 2) return "ADMIN";
    const payload = JSON.parse(atob(parts[1]!)) as { role?: string };
    return payload.role === "MANAGER" ? "MANAGER" : "ADMIN";
  } catch {
    return "ADMIN";
  }
}

export function isCloudAdminRole(): boolean {
  return getCloudAdminRoleFromToken() === "ADMIN";
}

/** JWT `sub` (cloud admin user id) when present; used for client-side UX only — server enforces rules. */
export function getCloudAdminIdFromToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("cloud_token");
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1]!)) as { sub?: string };
    return typeof payload.sub === "string" && payload.sub.length > 0 ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Paths managers must not open in Settings (backend also returns 403). */
export const MANAGER_BLOCKED_SETTINGS_PATHS = new Set([
  "/settings/business-details",
  "/settings/subscription",
  "/settings/receipts",
  "/settings/sales-inventory",
  "/settings/password-pins",
  "/settings/devices",
  "/settings/dev",
  "/settings/customer-display",
]);
