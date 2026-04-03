import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const PREFIX = "scrypt1";
const SALT_LEN = 16;
const KEY_LEN = 32;
const SCRYPT_N = 16384;

/** Hash staff PIN for storage. Must match apps/api/src/lib/staffPin.ts */
export function hashStaffPin(pin: string): string {
  const normalized = String(pin ?? "").trim();
  const salt = randomBytes(SALT_LEN);
  const hash = scryptSync(normalized, salt, KEY_LEN, { N: SCRYPT_N, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `${PREFIX}$${salt.toString("hex")}$${hash.toString("hex")}`;
}
