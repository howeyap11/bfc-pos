import { scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LEN = 64;

/**
 * Verify password against stored scrypt hash (same format as cloud-api).
 * Stored format: "salt:hex"
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored?.trim()) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const derived = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
    const hashBuf = Buffer.from(hash, "hex");
    if (derived.length !== hashBuf.length) return false;
    return timingSafeEqual(derived, hashBuf);
  } catch {
    return false;
  }
}
