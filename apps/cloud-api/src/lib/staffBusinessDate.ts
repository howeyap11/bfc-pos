/**
 * Staff audit business day in audit TZ. Rollover minutes (from midnight in shifted "wall" space)
 * default matches StoreSetting / workDayDefaults — configurable via StoreSetting.workDayFromTimeLocal on cloud.
 */
import { DEFAULT_WORK_DAY_ROLLOVER_MINUTES } from "./workDayDefaults.js";

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

/** @param rolloverMinutesFromMidnight e.g. 240 = 4:00 AM boundary */
export function staffBusinessDateKeyWithRollover(utc: Date, rolloverMinutesFromMidnight: number): string {
  const offsetHours = getStaffAuditTzOffsetHours();
  const businessMs = utc.getTime() + offsetHours * 60 * 60 * 1000;
  const shiftedMs = businessMs - rolloverMinutesFromMidnight * 60 * 1000;
  const b = new Date(shiftedMs);
  const y = b.getUTCFullYear();
  const m = b.getUTCMonth() + 1;
  const d = b.getUTCDate();
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** Canonical fallback rollover when callers have no DB setting (tests / legacy). */
export function staffBusinessDateKey(utc: Date): string {
  return staffBusinessDateKeyWithRollover(utc, DEFAULT_WORK_DAY_ROLLOVER_MINUTES);
}

/**
 * UTC [start, end) for all instants whose staff business date key equals `bd` (YYYY-MM-DD),
 * using the same shifted-wall + rollover convention as staffBusinessDateKeyWithRollover.
 */
export function utcRangeForStaffBusinessDateKey(
  bd: string,
  rolloverMinutesFromMidnight: number
): { start: Date; end: Date } {
  const parts = bd.trim().split("-").map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    const now = new Date();
    return { start: now, end: now };
  }
  const [ys, ms, ds] = parts;
  const offsetHours = getStaffAuditTzOffsetHours();
  const S = Date.UTC(ys, ms - 1, ds);
  const E = Date.UTC(ys, ms - 1, ds + 1);
  const R = rolloverMinutesFromMidnight * 60 * 1000;
  const offsetMs = offsetHours * 60 * 60 * 1000;
  const startMs = S + R - offsetMs;
  const endMs = E + R - offsetMs;
  return { start: new Date(startMs), end: new Date(endMs) };
}

export function staffAuditLocalHour(utc: Date): number {
  const offsetHours = getStaffAuditTzOffsetHours();
  const businessMs = utc.getTime() + offsetHours * 60 * 60 * 1000;
  const b = new Date(businessMs);
  return b.getUTCHours();
}
