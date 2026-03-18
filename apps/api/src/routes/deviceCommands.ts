import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireStaffHook } from "../plugins/staffGuard.js";
import { requireAdminRole } from "../services/syncCatalog.service.js";
import { pollDeviceCommands, executeLocalCommand } from "../services/deviceCommandPolling.service.js";
import { getDeviceKey, maskForKeyDisplay, setDeviceKey, clearDeviceKey } from "../services/deviceKey.service.js";

export async function deviceCommandsRoutes(app: FastifyInstance) {
  const adminGuard = async (req: FastifyRequest, reply: FastifyReply) => {
    if (!requireAdminRole(req as { staff?: { role?: string } })) {
      return reply.code(403).send({ error: "FORBIDDEN", message: "Admin role required" });
    }
  };

  /** GET device-key: masked status only (staff). Never returns the key. */
  app.get("/device-key", { preHandler: [requireStaffHook] }, async (_req, reply) => {
    const key = getDeviceKey();
    const configured = key.length > 0;
    return reply.send({
      configured,
      ...(configured && { masked: maskForKeyDisplay(key) }),
    });
  });

  /** PUT device-key: set key (admin). Body { key: string }. Validates trim, non-empty. */
  app.put("/device-key", { preHandler: [requireStaffHook, adminGuard] }, async (req, reply) => {
    const body = req.body as { key?: string };
    const raw = body?.key;
    const key = typeof raw === "string" ? raw.trim() : "";
    if (!key) {
      return reply.code(400).send({ error: "EMPTY_KEY", message: "Device key cannot be empty" });
    }
    try {
      setDeviceKey(key);
      return reply.send({ ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.code(400).send({ error: "INVALID", message: msg });
    }
  });

  /** DELETE device-key: clear stored key (admin). Env fallback still applies until restart. */
  app.delete("/device-key", { preHandler: [requireStaffHook, adminGuard] }, async (_req, reply) => {
    clearDeviceKey();
    return reply.send({ ok: true });
  });

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

  /** Force sync catalog + transactions (admin-only, used inside PIN-gated UI) */
  app.post("/device/commands/sync", { preHandler: [requireStaffHook, adminGuard] }, async (req, reply) => {
    const result = await executeLocalCommand(app, "FORCE_SYNC");
    if (!result.ok) reply.code(500);
    return result;
  });

  /** Force catalog sync only – staff session required, no admin PIN. For emergency menu updates without unlocking admin. */
  app.post("/device/commands/sync-catalog", { preHandler: [requireStaffHook] }, async (req, reply) => {
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
