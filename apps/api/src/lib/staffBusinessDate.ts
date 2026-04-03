/**
 * Staff audit "business day" for attendance, inventory counts, waste, SOP, shifts, etc.
 *
 * RULE (operator / auditor): day runs 04:00 → 03:59:59 next calendar day in the configured
 * audit timezone (default +8, same family as DASHBOARD_TZ_OFFSET_HOURS).
 *
 * Examples (Manila +8):
 * - 2026-04-04 03:30 local → business date 2026-04-03
 * - 2026-04-04 04:00 local → business date 2026-04-04
 *
 * Implementation: shift local wall-clock by tz offset, subtract 4 hours, then read UTC calendar
 * components (same pattern as dashboard "business day" but with a 4am cutover).
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

/** YYYY-MM-DD for the staff-audit business day containing `utc`. */
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

/** Local hour 0–23 in audit TZ (for time-window fallbacks). */
export function staffAuditLocalHour(utc: Date): number {
  const offsetHours = getStaffAuditTzOffsetHours();
  const businessMs = utc.getTime() + offsetHours * 60 * 60 * 1000;
  const b = new Date(businessMs);
  return b.getUTCHours();
}
