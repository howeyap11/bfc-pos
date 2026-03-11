import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { randomBytes } from "node:crypto";
import { z } from "zod";

const DEVICE_COMMAND_TYPES = ["UPDATE_POS", "RESTART_POS", "FORCE_SYNC"] as const;

async function adminAuthHook(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    reply.code(401);
    return reply.send({ error: "UNAUTHORIZED" });
  }
}

export async function deviceRoutes(app: FastifyInstance) {
  app.addHook("preHandler", adminAuthHook);
  // GET /admin/devices - list all devices
  app.get("/devices", async () => {
    const devices = await app.prisma.device.findMany({
      orderBy: { name: "asc" },
      include: {
        commands: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });
    return {
      devices: devices.map((d) => ({
        id: d.id,
        storeId: d.storeId,
        name: d.name,
        deviceKeyPreview: d.deviceKey ? `${d.deviceKey.slice(0, 8)}…` : null,
        lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
        posVersion: d.posVersion,
        recentCommands: d.commands.map((c) => ({
          id: c.id,
          type: c.type,
          status: c.status,
          errorMessage: c.errorMessage,
          createdAt: c.createdAt.toISOString(),
          completedAt: c.completedAt?.toISOString() ?? null,
        })),
      })),
    };
  });

  // POST /admin/devices - create device (owner/admin)
  app.post("/devices", async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = z
      .object({
        name: z.string().min(1),
        storeId: z.string().optional().default("store_1"),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "INVALID_BODY", message: parsed.error.message };
    }

    const deviceKey = randomBytes(24).toString("hex");
    const device = await app.prisma.device.create({
      data: {
        name: parsed.data.name,
        storeId: parsed.data.storeId,
        deviceKey,
      },
    });
    return {
      device: {
        id: device.id,
        name: device.name,
        storeId: device.storeId,
        deviceKey, // Only returned on create - owner must copy to POS .env
      },
    };
  });

  // GET /admin/devices/:id - get device with commands
  app.get("/devices/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const device = await app.prisma.device.findUnique({
      where: { id: req.params.id },
      include: { commands: { orderBy: { createdAt: "desc" }, take: 20 } },
    });
    if (!device) {
      reply.code(404);
      return { error: "NOT_FOUND" };
    }
    return {
      device: {
        id: device.id,
        name: device.name,
        storeId: device.storeId,
        deviceKeyPreview: `${device.deviceKey.slice(0, 8)}…`,
        lastSeenAt: device.lastSeenAt?.toISOString() ?? null,
        posVersion: device.posVersion,
        commands: device.commands.map((c) => ({
          id: c.id,
          type: c.type,
          status: c.status,
          errorMessage: c.errorMessage,
          createdAt: c.createdAt.toISOString(),
          startedAt: c.startedAt?.toISOString() ?? null,
          completedAt: c.completedAt?.toISOString() ?? null,
        })),
      },
    };
  });

  // POST /admin/devices/:id/commands - create command (owner/admin)
  app.post(
    "/devices/:id/commands",
    async (
      req: FastifyRequest<{
        Params: { id: string };
        Body: { type: string };
      }>,
      reply: FastifyReply
    ) => {
      const parsed = z
        .object({
          type: z.enum(DEVICE_COMMAND_TYPES),
        })
        .safeParse(req.body);
      if (!parsed.success) {
        reply.code(400);
        return { error: "INVALID_BODY", message: "type must be one of: UPDATE_POS, RESTART_POS, FORCE_SYNC" };
      }

      const device = await app.prisma.device.findUnique({ where: { id: req.params.id } });
      if (!device) {
        reply.code(404);
        return { error: "NOT_FOUND" };
      }

      const cmd = await app.prisma.deviceCommand.create({
        data: { deviceId: device.id, type: parsed.data.type },
      });
      return { command: { id: cmd.id, type: cmd.type, status: cmd.status, createdAt: cmd.createdAt.toISOString() } };
    }
  );

  // DELETE /admin/devices/:id - remove device
  app.delete("/devices/:id", async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const device = await app.prisma.device.findUnique({ where: { id: req.params.id } });
    if (!device) {
      reply.code(404);
      return { error: "NOT_FOUND" };
    }
    await app.prisma.device.delete({ where: { id: device.id } });
    return { ok: true };
  });
}
