import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const PREFIX = "scrypt1";
const SALT_LEN = 16;
const KEY_LEN = 32;
const SCRYPT_N = 16384;

/** Hash staff PIN for storage (synced from cloud). Uses scrypt; format: scrypt1$<saltHex>$<hashHex> */
export function hashStaffPin(pin: string): string {
  const normalized = String(pin ?? "").trim();
  const salt = randomBytes(SALT_LEN);
  const hash = scryptSync(normalized, salt, KEY_LEN, { N: SCRYPT_N, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `${PREFIX}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

/**
 * Verify PIN against passcodeHash (preferred) or legacy plaintext passcode.
 * No network calls.
 */
export function verifyStaffPin(pin: string, passcodeHash: string | null | undefined, legacyPasscode: string | null | undefined): boolean {
  const p = String(pin ?? "").trim();
  if (!p) return false;
  const hash = passcodeHash != null && String(passcodeHash).trim() !== "" ? String(passcodeHash).trim() : null;
  if (hash && hash.startsWith(`${PREFIX}$`)) {
    const parts = hash.split("$");
    if (parts.length !== 3) return false;
    const [, saltHex, expectedHex] = parts;
    try {
      const salt = Buffer.from(saltHex, "hex");
      const expected = Buffer.from(expectedHex, "hex");
      const derived = scryptSync(p, salt, expected.length, { N: SCRYPT_N, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
      return derived.length === expected.length && timingSafeEqual(derived, expected);
    } catch {
      return false;
    }
  }
  const legacy = legacyPasscode != null ? String(legacyPasscode).trim() : "";
  if (!legacy) return false;
  const a = Buffer.from(p, "utf8");
  const b = Buffer.from(legacy, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
