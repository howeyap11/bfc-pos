/**
 * Calendar YYYY-MM-DD in the browser's local timezone (not UTC).
 * Staff **business** dates (work log, manual inventory) use work hours From + audit TZ on the server — see
 * `api.getWorkLogTodayBusinessDate()`; this helper is only a fallback when that call fails.
 */
export function getDefaultLocalDateString(): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const DEFAULT_BUSINESS_OFFSET_HOURS = 8;

function readDashboardTzOffsetHours(): number {
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_DASHBOARD_TZ_OFFSET_HOURS) {
    const n = parseInt(process.env.NEXT_PUBLIC_DASHBOARD_TZ_OFFSET_HOURS, 10);
    if (!Number.isNaN(n) && n >= -14 && n <= 14) return n;
  }
  return DEFAULT_BUSINESS_OFFSET_HOURS;
}

/**
 * "Today" for Cloud Admin transaction/dashboard date filters: same calendar day as
 * `apps/cloud-api` `getDefaultDateRange()` / `localBusinessDateRangeToUtc` (default Asia/Manila +8).
 * Fixes SSR/host UTC using midnight UTC as the default date (one day behind Manila).
 */
export function getDefaultBusinessDateString(): string {
  const n = new Date();
  const offsetHours = readDashboardTzOffsetHours();
  const businessMs = n.getTime() + offsetHours * 60 * 60 * 1000;
  const b = new Date(businessMs);
  const y = b.getUTCFullYear();
  const m = String(b.getUTCMonth() + 1).padStart(2, "0");
  const d = String(b.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
