// apps/api/src/routes/owner.ts
import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { getTransactionSyncOutboxStatus } from "../services/outbox.service.js";
import { getSyncStatus } from "../services/syncScheduler.js";
import { isOnline } from "../services/connectivity.service.js";
import { verifyPassword } from "../lib/password.js";

const OWNER_PASSWORD_ENV = "BFC_OWNER_PASSWORD";
const OWNER_PASSWORD_FALLBACK_ENV = "BFC_OWNER_PASSWORD_FALLBACK";

const ownerRoutes: FastifyPluginAsync = async (app) => {
  /** Verify owner/developer password. Cloud-controlled hash preferred; env fallback only if explicitly enabled. */
  app.post("/owner/verify-password", async (req, reply) => {
    const body = req.body as { password?: string };
    const password = typeof body.password === "string" ? body.password.trim() : "";

    if (!password) {
      app.log.info({ event: "owner_unlock", result: "rejected", reason: "empty" }, "[Owner] Unlock attempt");
      return reply.code(401).send({ ok: false, error: "INVALID_PASSWORD", message: "Invalid owner password" });
    }

    let valid = false;
    let source: "cached" | "env_fallback" = "cached";

    const row = await app.prisma.cloudStoreSetting.findUnique({ where: { id: "1" } });

    // 1. Cached hash from cloud (primary)
    try {
      if (row?.ownerPasswordHash) {
        valid = await verifyPassword(password, row.ownerPasswordHash);
      }
    } catch (err) {
      app.log.warn({ err }, "[Owner] Failed to verify against cached hash");
    }

    // 2. Optional env fallback (only when BFC_OWNER_PASSWORD_FALLBACK=1)
    if (!valid && process.env[OWNER_PASSWORD_FALLBACK_ENV] === "1") {
      const envPassword = process.env[OWNER_PASSWORD_ENV];
      if (envPassword?.trim() && password === envPassword) {
        valid = true;
        source = "env_fallback";
      }
    }

    if (valid) {
      app.log.info({ event: "owner_unlock", result: "ok", source }, "[Owner] Unlock success");
      return { ok: true };
    }

    // Check if owner tools is configured (fail safe)
    const hasConfig = !!(row?.ownerPasswordHash) ||
      (process.env[OWNER_PASSWORD_FALLBACK_ENV] === "1" && process.env[OWNER_PASSWORD_ENV]?.trim());

    app.log.info(
      { event: "owner_unlock", result: "rejected", reason: hasConfig ? "invalid_password" : "not_configured" },
      "[Owner] Unlock attempt failed"
    );

    if (!hasConfig) {
      return reply.code(401).send({
        ok: false,
        error: "OWNER_DISABLED",
        message: "Owner tools not configured. Set owner password in Cloud Admin → Settings.",
      });
    }

    return reply.code(401).send({ ok: false, error: "INVALID_PASSWORD", message: "Invalid owner password" });
  });

  /** System status for owner tools: sync, connectivity. No sensitive data. */
  app.get("/owner/system-status", async () => {
    const [outboxStatus, catalogSync, connectivity] = await Promise.all([
      getTransactionSyncOutboxStatus(app.prisma),
      Promise.resolve(getSyncStatus()),
      isOnline(),
    ]);

    return {
      cloudSync: {
        pendingCount: outboxStatus.pendingCount,
        highRetryCount: outboxStatus.highRetryCount,
      },
      catalogSync: {
        status: catalogSync.status,
        lastSyncAt: catalogSync.lastSyncAt,
        lastError: catalogSync.lastError,
      },
      connectivity: { online: connectivity },
    };
  });
};

export const ownerRoutesPlugin = fp(ownerRoutes, { name: "ownerRoutes", dependencies: ["prisma"] });
