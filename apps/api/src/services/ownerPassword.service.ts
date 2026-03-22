/**
 * Owner password: cloud-controlled, cached locally for offline verification.
 * Syncs from GET /sync/owner-password-hash (X-Store-Sync-Key). Never stores plain password.
 */
import type { PrismaClient } from "@prisma/client";

const CLOUD_URL = process.env.CLOUD_URL ?? "";
const STORE_SYNC_SECRET = process.env.STORE_SYNC_SECRET ?? "";
const BFC_OWNER_PASSWORD_FALLBACK = "BFC_OWNER_PASSWORD_FALLBACK";
const TIMEOUT_MS = 5000;

export type SyncOwnerPasswordResult =
  | { ok: true; updated: boolean }
  | { ok: false; error: string };

/**
 * Fetch owner password hash from cloud and cache in CloudStoreSetting.
 * Trigger: startup, reconnect, periodically (5-10 min).
 */
export async function syncOwnerPasswordHash(
  prisma: PrismaClient,
  log?: { info: (o: object, msg: string) => void; warn: (o: object, msg: string) => void }
): Promise<SyncOwnerPasswordResult> {
  if (!CLOUD_URL?.trim()) {
    return { ok: false, error: "CLOUD_URL not configured" };
  }
  if (!STORE_SYNC_SECRET?.trim()) {
    return { ok: false, error: "STORE_SYNC_SECRET not configured" };
  }

  const url = `${CLOUD_URL.replace(/\/$/, "")}/sync/owner-password-hash`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "X-Store-Sync-Key": STORE_SYNC_SECRET },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { ok: false, error: `Cloud returned ${res.status}` };
    }

    const data = (await res.json()) as { ownerPasswordHash?: string | null };
    const hash = typeof data.ownerPasswordHash === "string" && data.ownerPasswordHash.trim()
      ? data.ownerPasswordHash.trim()
      : null;

    if (!prisma.cloudStoreSetting) {
      return { ok: false, error: "CloudStoreSetting model not available" };
    }

    const existing = await prisma.cloudStoreSetting.findUnique({ where: { id: "1" } });
    const prevHash = existing?.ownerPasswordHash ?? null;
    const updated = prevHash !== hash;

    if (existing) {
      await prisma.cloudStoreSetting.update({
        where: { id: "1" },
        data: { ownerPasswordHash: hash },
      });
    } else {
      await prisma.cloudStoreSetting.create({
        data: { id: "1", adminPinHash: null, ownerPasswordHash: hash },
      });
    }

    if (updated && log) {
      log.info(
        { hadPrevious: !!prevHash, hasNew: !!hash },
        "[OwnerPassword] Owner password hash updated from cloud"
      );
    }

    return { ok: true, updated };
  } catch (err) {
    clearTimeout(timeout);
    const msg = err instanceof Error ? err.message : String(err);
    if (log) {
      log.warn({ err: msg }, "[OwnerPassword] Sync failed, using cached hash if any");
    }
    return { ok: false, error: msg };
  }
}
