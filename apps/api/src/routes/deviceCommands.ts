import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireStaffHook } from "../plugins/staffGuard.js";
import { requireAdminRole } from "../services/syncCatalog.service.js";
import { pollDeviceCommands, executeLocalCommand } from "../services/deviceCommandPolling.service.js";

export async function deviceCommandsRoutes(app: FastifyInstance) {
  const adminGuard = async (req: FastifyRequest, reply: FastifyReply) => {
    if (!requireAdminRole(req as { staff?: { role?: string } })) {
      return reply.code(403).send({ error: "FORBIDDEN", message: "Admin role required" });
    }
  };

  /** Trigger immediate cloud command poll (check for updates) */
  app.post("/device/poll-commands", { preHandler: [requireStaffHook, adminGuard] }, async (req, reply) => {
    await pollDeviceCommands(app);
    return { ok: true };
  });

  /** Run update script locally */
  app.post("/device/commands/update", { preHandler: [requireStaffHook, adminGuard] }, async (req, reply) => {
    const result = await executeLocalCommand(app, "UPDATE_POS");
    if (!result.ok) reply.code(400);
    return result;
  });

  /** Restart POS (process exits, NSSM restarts) */
  app.post("/device/commands/restart", { preHandler: [requireStaffHook, adminGuard] }, async (req, reply) => {
    await executeLocalCommand(app, "RESTART_POS");
    return { ok: true };
  });

  /** Force sync catalog + transactions */
  app.post("/device/commands/sync", { preHandler: [requireStaffHook, adminGuard] }, async (req, reply) => {
    const result = await executeLocalCommand(app, "FORCE_SYNC");
    if (!result.ok) reply.code(500);
    return result;
  });

  /** Reset local catalog sync version to 0, then run catalog sync immediately (full bootstrap). Recovery path for missing catalog/size data. */
  app.post("/device/commands/reset-catalog-sync", { preHandler: [requireStaffHook, adminGuard] }, async (req, reply) => {
    try {
      await app.prisma.syncState.upsert({
        where: { branchId: "default" },
        create: { branchId: "default", catalogVersion: 0 },
        update: { catalogVersion: 0 },
      });
      const result = await executeLocalCommand(app, "FORCE_SYNC");
      if (!result.ok) {
        return reply.code(500).send({
          ok: false,
          error: result.error,
          message: "Catalog version reset to 0, but sync failed. Next sync will be full.",
        });
      }
      return { ok: true, message: "Catalog reset and full sync completed." };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ ok: false, error: msg, message: msg });
    }
  });
}
