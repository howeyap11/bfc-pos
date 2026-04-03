/**
 * Staff audit business day (04:00 → 03:59 next day) in audit TZ — mirrors apps/api implementation
 * so cloud grouping matches store-local submissions.
 */

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function getStaffAuditTzOffsetHours(): number {
  const v = process.env.STAFF_AUDIT_TZ_OFFSET_HOURS ?? process.env.DASHBOARD_TZ_OFFSET_HOURS;
  if (v !== undefined && v !== "") {
    const n = parseInt(v, 10);
    if (!Number.isNaN(n) && n >= -14 && n <= 14) return n;
  }
  return 8;
}

export function staffBusinessDateKey(utc: Date): string {
  const offsetHours = getStaffAuditTzOffsetHours();
  const businessMs = utc.getTime() + offsetHours * 60 * 60 * 1000;
  const shiftedMs = businessMs - 4 * 60 * 60 * 1000;
  const b = new Date(shiftedMs);
  const y = b.getUTCFullYear();
  const m = b.getUTCMonth() + 1;
  const d = b.getUTCDate();
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

export function staffAuditLocalHour(utc: Date): number {
  const offsetHours = getStaffAuditTzOffsetHours();
  const businessMs = utc.getTime() + offsetHours * 60 * 60 * 1000;
  const b = new Date(businessMs);
  return b.getUTCHours();
}
