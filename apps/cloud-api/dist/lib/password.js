import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const scryptAsync = promisify(scrypt);
const SALT_LEN = 16;
const KEY_LEN = 64;
export async function hashPassword(password) {
    const salt = randomBytes(SALT_LEN).toString("hex");
    const derived = (await scryptAsync(password, salt, KEY_LEN));
    return `${salt}:${derived.toString("hex")}`;
}
export async function verifyPassword(password, stored) {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash)
        return false;
    const derived = (await scryptAsync(password, salt, KEY_LEN));
    const hashBuf = Buffer.from(hash, "hex");
    if (derived.length !== hashBuf.length)
        return false;
    return timingSafeEqual(derived, hashBuf);
}
