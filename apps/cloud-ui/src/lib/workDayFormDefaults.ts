/**
 * Form/UI fallbacks when Sales & Inventory API omits work hours (matches cloud StoreSetting Prisma defaults).
 * Rollover math always uses server-side StoreSetting + staffBusinessDate; do not duplicate cutover logic here.
 */
export const STOREFALLBACK_WORK_HOURS_FROM = "04:00";
export const STOREFALLBACK_WORK_HOURS_TO = "04:00";
