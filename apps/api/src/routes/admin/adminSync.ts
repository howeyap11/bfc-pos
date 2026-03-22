import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireStaffHook } from "../../plugins/staffGuard.js";
import { syncCatalogFromCloud, requireAdminRole } from "../../services/syncCatalog.service.js";
import {
  backfillTransactionSyncOutbox,
  processTransactionSyncOutbox,
  getTransactionSyncOutboxStatus,
} from "../../services/outbox.service.js";
import { uploadTransactionToCloud } from "../../services/transactionSync.service.js";
import { isOnline } from "../../services/connectivity.service.js";

function getBranchFromRequest(req: FastifyRequest): string {
  const raw = req.headers["x-branch-id"];
  const val = Array.isArray(raw) ? raw[0] : raw;
  return (typeof val === "string" ? val.trim() : "") || "default";
}

export async function adminSyncRoutes(app: FastifyInstance) {
  app.post(
    "/admin/sync/catalog",
    {
      preHandler: [
        requireStaffHook,
        async (req: FastifyRequest, reply: FastifyReply) => {
          if (!requireAdminRole(req as { staff?: { role?: string } })) {
            return reply.code(403).send({
              error: "FORBIDDEN",
              message: "Admin role required",
            });
          }
        },
      ],
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const branchId = getBranchFromRequest(req);
      const outcome = await syncCatalogFromCloud(app.prisma, branchId);

      if (!outcome.ok) {
        reply.code(outcome.code);
        return { error: outcome.error };
      }

      return {
        latestVersion: outcome.result.latestVersion,
        itemsUpserted: outcome.result.itemsUpserted,
        ingredientsUpserted: outcome.result.ingredientsUpserted,
        recipeLinesUpserted: outcome.result.recipeLinesUpserted,
        recipeLineSizesUpserted: outcome.result.recipeLineSizesUpserted,
        transactionTypesUpserted: outcome.result.transactionTypesUpserted,
        shotPricingRulesUpserted: outcome.result.shotPricingRulesUpserted,
      };
    }
  );

  /** Get transaction sync outbox status (pending count, high-retry count) for admin visibility. */
  app.get(
    "/admin/sync/transactions/status",
    {
      preHandler: [
        requireStaffHook,
        async (req: FastifyRequest, reply: FastifyReply) => {
          if (!requireAdminRole(req as { staff?: { role?: string } })) {
            return reply.code(403).send({
              error: "FORBIDDEN",
              message: "Admin role required",
            });
          }
        },
      ],
    },
    async () => {
      return getTransactionSyncOutboxStatus(app.prisma);
    }
  );

  // Manual trigger: process transaction sync outbox
  app.post(
    "/admin/sync/transactions",
    {
      preHandler: [
        requireStaffHook,
        async (req: FastifyRequest, reply: FastifyReply) => {
          if (!requireAdminRole(req as { staff?: { role?: string } })) {
            return reply.code(403).send({
              error: "FORBIDDEN",
              message: "Admin role required",
            });
          }
        },
      ],
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const result = await processTransactionSyncOutbox(
        app.prisma,
        uploadTransactionToCloud,
        50,
        app.log
      );
      return result;
    }
  );

  /** Enqueue PAID/VOID transactions missing from cloud-sync outbox (one-time catch-up). */
  app.post(
    "/admin/sync/transactions/backfill",
    {
      preHandler: [
        requireStaffHook,
        async (req: FastifyRequest, reply: FastifyReply) => {
          if (!requireAdminRole(req as { staff?: { role?: string } })) {
            return reply.code(403).send({
              error: "FORBIDDEN",
              message: "Admin role required",
            });
          }
        },
      ],
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const online = await isOnline();
      if (!online) {
        reply.code(503);
        return {
          ok: false,
          error: "OFFLINE",
          message: "Cannot sync: device is offline",
        };
      }
      const result = await backfillTransactionSyncOutbox(app.prisma);
      const flush = await processTransactionSyncOutbox(
        app.prisma,
        uploadTransactionToCloud,
        50,
        app.log
      );
      const msgParts = [];
      if (result.recoveredFailed > 0) msgParts.push(`${result.recoveredFailed} FAILED reset to PENDING`);
      msgParts.push(`Enqueued ${result.enqueued} transaction(s)`);
      msgParts.push(`${result.skippedAlreadyQueued} already queued or synced`);
      return {
        ok: true,
        message: msgParts.join("; "),
        ...result,
        flushProcessed: flush.processed,
        flushSucceeded: flush.succeeded,
        flushFailed: flush.failed,
      };
    }
  );
}
