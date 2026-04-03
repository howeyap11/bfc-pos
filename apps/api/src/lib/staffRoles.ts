export const STAFF_MANAGER_ROLES = ["MANAGER", "ADMIN", "OWNER"] as const;
export const STAFF_AUDITOR_ROLES = ["AUDITOR", "MANAGER", "ADMIN", "OWNER"] as const;

/** Roles allowed to record warehouse → store pullout (staff-attributed; still requires staff auth). */
export const STAFF_WAREHOUSE_PULLOUT_ROLES = [
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

export function hasAnyRole(role: string | null | undefined, allowed: readonly string[]): boolean {
  if (!role) return false;
  return allowed.includes(role.toUpperCase());
}

export function canManageStaffOps(role: string | null | undefined): boolean {
  return hasAnyRole(role, STAFF_MANAGER_ROLES);
}

export function canAuditStaffOps(role: string | null | undefined): boolean {
  return hasAnyRole(role, STAFF_AUDITOR_ROLES);
}

export function canRecordWarehousePullout(role: string | null | undefined): boolean {
  return hasAnyRole(role, STAFF_WAREHOUSE_PULLOUT_ROLES);
}
