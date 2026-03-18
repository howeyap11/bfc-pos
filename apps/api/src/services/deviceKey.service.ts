/**
 * Runtime device key: file-based storage with env fallback.
 * Used for remote POS control (polling/heartbeat). Never log or expose the key.
 */
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const FILENAME = ".device-key";

function getFilePath(): string {
  return join(process.cwd(), FILENAME);
}

/**
 * Returns the device key: file content (trimmed) if file exists and non-empty, else process.env.DEVICE_KEY.
 * Do not log the return value.
 */
export function getDeviceKey(): string {
  const path = getFilePath();
  if (existsSync(path)) {
    try {
      const content = readFileSync(path, "utf8").trim();
      if (content) return content;
    } catch {
      // fall through to env
    }
  }
  return (process.env.DEVICE_KEY ?? "").trim();
}

/**
 * Mask for UI display only. Returns e.g. "abcd••••••••wxyz" for long keys, "••••••••" for short.
 * Do not use for auth or logging.
 */
export function maskForKeyDisplay(key: string): string {
  const k = key.trim();
  if (!k) return "";
  if (k.length <= 8) return "••••••••";
  return `${k.slice(0, 4)}••••••••${k.slice(-4)}`;
}

/**
 * Saves key to file. Validates: trims, rejects empty. Throws on validation or write error.
 * Caller must never log the key.
 */
export function setDeviceKey(key: string): void {
  const trimmed = typeof key === "string" ? key.trim() : "";
  if (!trimmed) throw new Error("Device key cannot be empty");
  const path = getFilePath();
  writeFileSync(path, trimmed, "utf8");
}

/**
 * Removes the stored key file. Env fallback still applies until process restart.
 */
export function clearDeviceKey(): void {
  const path = getFilePath();
  if (existsSync(path)) {
    try {
      unlinkSync(path);
    } catch {
      // ignore
    }
  }
}
