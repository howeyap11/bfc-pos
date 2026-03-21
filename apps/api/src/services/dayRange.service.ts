/**
 * Single source of truth for calendar-day date ranges.
 * Used by: Transactions list, Transactions summary, Z-Reading.
 *
 * Rule: Strict calendar day boundaries.
 * - From: selected day at 00:00:00.000 local time
 * - to: selected day at 23:59:59.999 (for display)
 * - toExclusive: next day 00:00:00.000 — use createdAt < toExclusive to exclude midnight next day
 *
 * Example for March 12, 2026:
 *   - Include: createdAt >= from AND createdAt < toExclusive
 *   - Exclude: March 13 00:00:00.000 (midnight next day)
 */
export type DayRange = { from: Date; to: Date; toExclusive: Date };

/**
 * Get the calendar day range for aggregation (summary, Z-Reading, list filter).
 * Uses local timezone to avoid UTC vs local parsing ambiguities.
 * @param selectedDate - YYYY-MM-DD string or Date
 * @returns { from, to } where from is 00:00:00.000 and to is 23:59:59.999 of that day (local)
 */
export function getCalendarDayRange(selectedDate: string | Date): DayRange {
  let from: Date;
  if (selectedDate instanceof Date) {
    from = new Date(selectedDate);
    from.setHours(0, 0, 0, 0);
  } else {
    const [y, m, d] = selectedDate.split("-").map(Number);
    if (!y || !m || !d) {
      from = new Date(selectedDate + "T00:00:00");
      from.setHours(0, 0, 0, 0);
    } else {
      from = new Date(y, m - 1, d, 0, 0, 0, 0);
    }
  }
  const to = new Date(from);
  to.setHours(23, 59, 59, 999);
  const toExclusive = new Date(from);
  toExclusive.setDate(toExclusive.getDate() + 1);
  toExclusive.setHours(0, 0, 0, 0);
  return { from, to, toExclusive };
}
