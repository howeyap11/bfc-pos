/**
 * Staff audit "business day" for attendance, inventory counts, waste, SOP, shifts, etc.
 * Rollover defaults match cloud `StoreSetting` / local `CloudStoreSetting` when sync has not populated a value.
 */

/** Matches Prisma defaults when settings are missing. */
export const DEFAULT_WORK_DAY_FROM_TIME_LOCAL = "04:00";
export const DEFAULT_WORK_DAY_TO_TIME_LOCAL = "04:00";
export const DEFAULT_WORK_DAY_CUTOVER_MINUTES = 4 * 60;

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

/** Parse "HH:mm" → minutes from midnight, or null if invalid. */
export function parseWorkDayCutoverMinutes(localTime: string | null | undefined): number | null {
  if (!localTime?.trim()) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(localTime.trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** YYYY-MM-DD for the staff-audit business day containing `utc`, using cutover minutes after local midnight (audit TZ). */
export function staffBusinessDateKeyWithCutover(utc: Date, cutoverMinutesFromMidnight: number): string {
  const offsetHours = getStaffAuditTzOffsetHours();
  const businessMs = utc.getTime() + offsetHours * 60 * 60 * 1000;
  const shiftedMs = businessMs - cutoverMinutesFromMidnight * 60 * 1000;
  const b = new Date(shiftedMs);
  const y = b.getUTCFullYear();
  const mo = b.getUTCMonth() + 1;
  const d = b.getUTCDate();
  return `${y}-${pad2(mo)}-${pad2(d)}`;
}

/** YYYY-MM-DD with canonical fallback cutover (tests / callers without settings). Prefer `staffBusinessDateKeyWithCutover` + synced settings in routes. */
export function staffBusinessDateKey(utc: Date): string {
  return staffBusinessDateKeyWithCutover(utc, DEFAULT_WORK_DAY_CUTOVER_MINUTES);
}

/** Local hour 0–23 in audit TZ (for time-window fallbacks). */
export function staffAuditLocalHour(utc: Date): number {
  const offsetHours = getStaffAuditTzOffsetHours();
  const businessMs = utc.getTime() + offsetHours * 60 * 60 * 1000;
  const b = new Date(businessMs);
  return b.getUTCHours();
}

/** Minutes from local midnight in audit TZ (0–1439). */
export function staffAuditLocalMinutesFromMidnight(utc: Date): number {
  const offsetHours = getStaffAuditTzOffsetHours();
  const businessMs = utc.getTime() + offsetHours * 60 * 60 * 1000;
  const b = new Date(businessMs);
  return b.getUTCHours() * 60 + b.getUTCMinutes();
}
