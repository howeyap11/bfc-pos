/**
 * Dev Mode: persisted per device/session. Dangerous dev tools only when allowed.
 * Does NOT enable any deletion of live production transactions.
 */

const DEV_MODE_KEY = "bfc_dev_mode";

export function getDevMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(DEV_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setDevMode(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEV_MODE_KEY, on ? "1" : "0");
  } catch {}
}

/** Only allow dangerous dev tools when Dev Mode is ON and not in production. */
export function canUseDangerousDevTools(): boolean {
  if (typeof window === "undefined") return false;
  if (!getDevMode()) return false;
  return process.env.NODE_ENV !== "production";
}
