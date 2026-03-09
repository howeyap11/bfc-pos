/**
 * Admin PIN verification: cloud-first when CLOUD_URL + STORE_SYNC_SECRET are set,
 * then synced CloudStoreSetting.adminPinHash (offline), then local Staff passcode.
 */
import type { PrismaClient } from "@prisma/client";
import { verifyPassword } from "../lib/password.js";

const CLOUD_URL = process.env.CLOUD_URL ?? "";
const STORE_SYNC_SECRET = process.env.STORE_SYNC_SECRET ?? "";

export type VerifyAdminPinResult =
  | { valid: true; staffId?: string; name?: string; role?: string; source: "cloud" | "local" }
  | { valid: false };

export async function verifyAdminPin(
  pin: string,
  prisma: PrismaClient
): Promise<VerifyAdminPinResult> {
  const p = (pin ?? "").trim();
  if (!p) return { valid: false };

  // 1. Try cloud first when configured
  if (CLOUD_URL?.trim() && STORE_SYNC_SECRET) {
    try {
      const url = `${CLOUD_URL.replace(/\/$/, "")}/sync/verify-admin-pin`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Store-Sync-Key": STORE_SYNC_SECRET,
        },
        body: JSON.stringify({ pin: p }),
      });
      const data = (await res.json()) as { valid?: boolean };
      if (data.valid === true) {
        return { valid: true, source: "cloud" };
      }
    } catch {
      // Cloud unreachable: fall back to local
    }
  }

  // 2. Fallback: synced admin PIN (CloudStoreSetting - for offline)
  try {
    const storeSetting = await prisma.cloudStoreSetting.findUnique({ where: { id: "1" } });
    if (storeSetting?.adminPinHash) {
      const ok = await verifyPassword(p, storeSetting.adminPinHash);
      if (ok) return { valid: true, source: "local" };
    }
  } catch {
    // CloudStoreSetting may not exist if migration not run
  }

  // 3. Fallback: local Staff (ADMIN/MANAGER with matching passcode)
  const staff = await prisma.staff.findFirst({
    where: {
      passcode: p,
      role: { in: ["ADMIN", "MANAGER"] },
      isActive: true,
    },
    select: { id: true, name: true, role: true },
  });

  if (staff) {
    return {
      valid: true,
      staffId: staff.id,
      name: staff.name ?? undefined,
      role: staff.role ?? undefined,
      source: "local",
    };
  }

  return { valid: false };
}
