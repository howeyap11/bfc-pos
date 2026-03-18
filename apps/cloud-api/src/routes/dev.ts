/**
 * Dev-mode routes: verify password, log dev actions, clear admin cache.
 * Does NOT delete any canonical transaction/order records.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { verifyPassword } from "../lib/password.js";

async function adminAuthHook(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    reply.code(401);
    return reply.send({ error: "UNAUTHORIZED" });
  }
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Only allow dangerous dev tools when not production (no tenant demo flag in cloud). */
export function canUseDangerousDevTools(): boolean {
  return !isProduction();
}

export async function devRoutes(app: FastifyInstance) {
  app.addHook("preHandler", adminAuthHook);

  const getAdminFromReq = async (req: FastifyRequest) => {
    const payload = await req.jwtVerify<{ sub: string; email: string }>();
    if (!payload?.sub) return null;
    const admin = await app.prisma.adminUser.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, passwordHash: true },
    });
    return admin;
  };

  // POST /admin/dev/verify-password – re-auth for dangerous action
  app.post("/dev/verify-password", async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = z.object({ password: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "INVALID_BODY", message: "password required" };
    }
    const admin = await getAdminFromReq(req);
    if (!admin) {
      reply.code(401);
      return { error: "UNAUTHORIZED" };
    }
    const ok = await verifyPassword(parsed.data.password, admin.passwordHash);
    if (!ok) {
      reply.code(401);
      return { error: "INVALID_PASSWORD", message: "Invalid password" };
    }
    return { ok: true };
  });

  // POST /admin/dev/log-action – audit log for dev actions
  app.post("/dev/log-action", async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = z
      .object({
        actionType: z.string().min(1),
        scope: z.string().optional(),
        deviceId: z.string().optional(),
        affectedCount: z.number().int().optional(),
        result: z.enum(["SUCCESS", "FAILURE"]),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "INVALID_BODY", message: parsed.error.message };
    }
    const payload = await req.jwtVerify<{ sub: string; email: string }>();
    const adminId = payload?.sub ?? "unknown";
    const adminEmail = payload?.email ?? "unknown";
    await app.prisma.devActionLog.create({
      data: {
        adminId,
        adminEmail,
        deviceId: parsed.data.deviceId ?? null,
        actionType: parsed.data.actionType,
        scope: parsed.data.scope ?? null,
        affectedCount: parsed.data.affectedCount ?? null,
        result: parsed.data.result,
        isProduction: isProduction(),
      },
    });
    return { ok: true };
  });

  // POST /admin/dev/clear-admin-cache – clear dashboard/local caches only; requires password. Does NOT delete SyncedTransaction.
  app.post("/dev/clear-admin-cache", async (req: FastifyRequest, reply: FastifyReply) => {
    if (isProduction()) {
      reply.code(403);
      return { error: "FORBIDDEN", message: "Dangerous dev tools are disabled in production." };
    }
    const parsed = z.object({ password: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "INVALID_BODY", message: "password required" };
    }
    const admin = await getAdminFromReq(req);
    if (!admin) {
      reply.code(401);
      return { error: "UNAUTHORIZED" };
    }
    const ok = await verifyPassword(parsed.data.password, admin.passwordHash);
    if (!ok) {
      reply.code(401);
      return { error: "INVALID_PASSWORD", message: "Invalid password" };
    }
    await app.prisma.devActionLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        actionType: "CLEAR_ADMIN_CACHE",
        scope: "dashboard and local admin caches",
        result: "SUCCESS",
        isProduction: false,
      },
    });
    return { ok: true, message: "Admin cache clear logged. Client should clear local caches." };
  });
}
