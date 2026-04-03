/**
 * Staff authentication helpers for POS and staff phone app (local API + x-staff-key).
 */

const STORAGE_KEY = "bfc_active_staff";

export type ActiveStaff = {
  id: string;
  name: string;
  role: string;
  staffKey: string;
  email?: string | null;
  /** Cloud Admin staff id when synced */
  staffCloudId?: string | null;
};

/**
 * Get the active staff key from localStorage
 */
export function getActiveStaffKey(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const staff: ActiveStaff = JSON.parse(stored);
    const key = staff.staffKey?.trim();

    if (!key) {
      console.warn("[staffAuth] Active staff has no staffKey");
      return null;
    }

    if (key.startsWith("staff_") && key.length < 30) {
      console.error("[staffAuth] Invalid staffKey detected (looks like staff ID, not auth key):", key.slice(0, 15));
      clearActiveStaff();
      throw new Error("Invalid stored staffKey (looks like staff id). Please login again.");
    }

    return key;
  } catch (e) {
    console.error("[staffAuth] Failed to get active staff key", e);
    return null;
  }
}

/**
 * Get the full active staff object from localStorage
 */
export function getActiveStaff(): ActiveStaff | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const staff: ActiveStaff = JSON.parse(stored);

    if (!staff.id || !staff.name || !staff.role || !staff.staffKey) {
      console.warn("[staffAuth] Active staff missing required fields", staff);
      return null;
    }

    return staff;
  } catch (e) {
    console.error("[staffAuth] Failed to get active staff", e);
    return null;
  }
}

export function setActiveStaff(staff: ActiveStaff): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(staff));
}

/**
 * Build headers with staff authentication for POS / staff API calls
 */
export function withStaffAuthHeaders(baseHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...baseHeaders,
  };

  const staffKey = getActiveStaffKey();
  if (staffKey) {
    headers["x-staff-key"] = staffKey;
  } else {
    console.warn("[staffAuth] No staffKey available - header not added");
  }

  return headers;
}

export function clearActiveStaff(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("[staffAuth] Failed to clear active staff", e);
  }
}
