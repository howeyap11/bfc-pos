/**
 * Staff authentication helpers for POS operations
 */

const STORAGE_KEY = "bfc_active_staff";

export type ActiveStaff = {
  id: string;
  name: string;
  role: string;
  staffKey: string;
};

/**
 * Get the active staff key from localStorage
 * @returns staffKey string or null if not logged in
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

    // Runtime guard: detect if staff ID was mistakenly used as key
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
 * @returns ActiveStaff object or null if not logged in
 */
export function getActiveStaff(): ActiveStaff | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const staff: ActiveStaff = JSON.parse(stored);
    
    // Validate required fields
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

/**
 * Build headers with staff authentication for POS API calls
 * @param baseHeaders - Optional base headers to merge with
 * @returns Headers object with x-staff-key if staff is logged in
 */
export function withStaffAuthHeaders(baseHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...baseHeaders,
  };

  const staffKey = getActiveStaffKey();
  if (staffKey) {
    headers["x-staff-key"] = staffKey;
    console.log("[staffAuth] Added x-staff-key header:", staffKey.slice(0, 10) + "...");
  } else {
    console.warn("[staffAuth] No staffKey available - header not added");
  }

  return headers;
}

/**
 * Clear the active staff session
 */
export function clearActiveStaff(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log("[staffAuth] Cleared active staff session");
  } catch (e) {
    console.error("[staffAuth] Failed to clear active staff", e);
  }
}
