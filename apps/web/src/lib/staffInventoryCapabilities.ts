/**
 * Mirrors apps/api/src/lib/staffRoles.ts for stock-movement UI (manager add vs operational pullout).
 */

const R = (role: string) => role.trim().toUpperCase();

const MANAGER_OR_AUDITOR = ["MANAGER", "ADMIN", "OWNER", "AUDITOR"] as const;

/** Same list as STAFF_WAREHOUSE_PULLOUT_ROLES on the API. */
const PULLOUT_ROLES = [
  "MANAGER",
  "ADMIN",
  "OWNER",
  "AUDITOR",
  "HEAD_BARISTA",
  "LEAD_BARISTA",
  "HEAD_CHEF",
  "BARISTA",
  "KITCHEN_STAFF",
] as const;

export function canAddStockToStoreOrWarehouse(role: string | null | undefined): boolean {
  if (!role) return false;
  return (MANAGER_OR_AUDITOR as readonly string[]).includes(R(role));
}

export function canRecordWarehousePullout(role: string | null | undefined): boolean {
  if (!role) return false;
  return (PULLOUT_ROLES as readonly string[]).includes(R(role));
}
