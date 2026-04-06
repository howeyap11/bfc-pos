/**
 * Work-day boundary for Work Log grouping and manual inventory business dates on cloud.
 * "From" time (HH:mm) is the rollover: business date = calendar date of (local wall + tz offset) shifted back by this many minutes from midnight.
 */
import type { PrismaClient } from "@prisma/client";
import {
  DEFAULT_WORK_DAY_FROM_TIME_LOCAL,
  DEFAULT_WORK_DAY_ROLLOVER_MINUTES,
} from "../lib/workDayDefaults.js";

/** Parse "HH:mm" → minutes from midnight, or null if invalid. */
export function parseTimeToMinutesFromMidnight(s: string | null | undefined): number | null {
  if (!s || typeof s !== "string") return null;
  const t = s.trim();
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(t);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  return (h * 60 + min + 1440) % 1440;
}

export async function getWorkDayRolloverMinutesFromDb(prisma: PrismaClient): Promise<number> {
  const row = await prisma.storeSetting.findUnique({ where: { id: "1" } });
  const raw = row?.workDayFromTimeLocal?.trim() || DEFAULT_WORK_DAY_FROM_TIME_LOCAL;
  return parseTimeToMinutesFromMidnight(raw) ?? DEFAULT_WORK_DAY_ROLLOVER_MINUTES;
}
