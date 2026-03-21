/**
 * Asia/Manila business-day utilities for Cloud Admin transaction reporting.
 *
 * WHY: Transaction totals must follow local Philippine calendar days (12:00 AM–11:59:59 PM Asia/Manila).
 * DB stores UTC; without conversion, transactions at 12:00 AM–1:59 AM Manila would be
 * counted under the previous UTC day. This helper converts selected local dates to
 * correct UTC [start, end) ranges for filtering/aggregation.
 */

export type DateRange = { start: Date; end: Date };

/** Asia/Manila UTC offset: +8 hours. Configurable via DASHBOARD_TZ_OFFSET_HOURS. */
export function getBusinessTzOffsetHours(): number {
  const v = process.env.DASHBOARD_TZ_OFFSET_HOURS;
  if (v !== undefined && v !== "") {
    const n = parseInt(v, 10);
    if (!Number.isNaN(n) && n >= -14 && n <= 14) return n;
  }
  return 8;
}

/**
 * Start of the given calendar day in Asia/Manila, as a UTC Date.
 * e.g. 2026-03-19 with offset +8 => 2026-03-18T16:00:00.000Z (midnight Mar 19 in Manila).
 */
function startOfDayUtc(y: number, m: number, d: number, offsetHours: number): Date {
  const ms = Date.UTC(y, m - 1, d, 0, 0, 0, 0) - offsetHours * 60 * 60 * 1000;
  return new Date(ms);
}

/**
 * Convert a local calendar date (YYYY-MM-DD) in Asia/Manila to UTC range [start, end).
 * Use: createdAt >= start && createdAt < end.
 *
 * For date "2026-03-19" this returns:
 * - start: 2026-03-18T16:00:00.000Z (midnight Mar 19 Manila)
 * - end: 2026-03-19T16:00:00.000Z (midnight Mar 20 Manila)
 */
export function localBusinessDayToUtcRange(dateStr: string): DateRange {
  const offsetHours = getBusinessTzOffsetHours();
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = startOfDayUtc(y, m, d, offsetHours);
  const end = startOfDayUtc(y, m, d + 1, offsetHours);
  return { start, end };
}

/**
 * Convert a date range (from, to inclusive) in Asia/Manila to UTC [start, end).
 * Both from and to are interpreted as calendar days in Asia/Manila.
 * Use: createdAt >= start && createdAt < end.
 */
export function localBusinessDateRangeToUtc(fromDate: string, toDate: string): DateRange {
  const offsetHours = getBusinessTzOffsetHours();
  const [sy, sm, sd] = fromDate.split("-").map(Number);
  const [ey, em, ed] = toDate.split("-").map(Number);
  const start = startOfDayUtc(sy, sm, sd, offsetHours);
  const end = startOfDayUtc(ey, em, ed + 1, offsetHours);
  return { start, end };
}

/**
 * Convert a calendar month (year, month) in Asia/Manila to UTC [start, end).
 * Use: createdAt >= start && createdAt < end.
 */
export function localBusinessMonthToUtcRange(year: number, month: number): DateRange {
  const offsetHours = getBusinessTzOffsetHours();
  const start = startOfDayUtc(year, month, 1, offsetHours);
  const end = startOfDayUtc(year, month + 1, 1, offsetHours);
  return { start, end };
}

/** Default date filter: today in Asia/Manila (so 1:00 AM local is still "today"). */
export function getDefaultDateRange(): { startDate: string; endDate: string } {
  const n = new Date();
  const offsetHours = getBusinessTzOffsetHours();
  const businessMs = n.getTime() + offsetHours * 60 * 60 * 1000;
  const b = new Date(businessMs);
  const y = b.getUTCFullYear();
  const m = String(b.getUTCMonth() + 1).padStart(2, "0");
  const d = String(b.getUTCDate()).padStart(2, "0");
  const date = `${y}-${m}-${d}`;
  return { startDate: date, endDate: date };
}
