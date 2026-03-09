// apps/api/src/routes/staff.ts
import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { verifyAdminPin } from "../services/adminPin.service.js";

const STORE_ID = "store_1";

const staffRoutes: FastifyPluginAsync = async (app) => {
  // GET /staff - List all staff members
  // Note: Returns passcode and key for local-first PIN validation and API authentication
  app.get("/staff", async (req, reply) => {
    const prisma = app.prisma;
    if (!prisma?.staff) {
      app.log.error("[Staff] Prisma staff model undefined - run: pnpm exec prisma generate --schema=apps/api/prisma/schema.prisma");
      return reply.code(500).send({ error: "PRISMA_NOT_READY", message: "Staff model not available" });
    }
    const staff = await prisma.staff.findMany({
      where: { storeId: STORE_ID, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        role: true,
        passcode: true,
        key: true,
        isActive: true,
      },
    });

    return staff;
  });

  // POST /staff/verify-admin-pin - Verify admin PIN without changing session
  // Cloud-first when CLOUD_URL + STORE_SYNC_SECRET; else local Staff (ADMIN/MANAGER)
  app.post("/staff/verify-admin-pin", async (req, reply) => {
    const body = req.body as { pin: string };

    if (!body.pin) {
      return reply.code(400).send({ error: "MISSING_PIN" });
    }

    const result = await verifyAdminPin(body.pin, app.prisma);

    if (!result.valid) {
      return reply.code(401).send({ error: "INVALID_PIN", message: "Invalid admin PIN" });
    }

    return {
      ok: true,
      staffId: result.staffId ?? "cloud-admin",
      name: result.name ?? "Admin",
      role: result.role ?? "ADMIN",
    };
  });

  // POST /staff/login - Validate staff passcode
  app.post("/staff/login", async (req, reply) => {
    const body = req.body as { staffId: string; passcode: string };

    if (!body.staffId || !body.passcode) {
      return reply.code(400).send({ error: "MISSING_FIELDS" });
    }

    const staff = await app.prisma.staff.findUnique({
      where: { id: body.staffId },
      select: {
        id: true,
        name: true,
        role: true,
        passcode: true,
        key: true,
        isActive: true,
      },
    });

    if (!staff || !staff.isActive) {
      return reply.code(404).send({ error: "STAFF_NOT_FOUND" });
    }

    if (staff.passcode !== body.passcode) {
      return reply.code(401).send({ error: "INVALID_PASSCODE" });
    }

    // Return staff info (without passcode, but WITH key for API authentication)
    return {
      id: staff.id,
      name: staff.name,
      role: staff.role,
      key: staff.key,
    };
  });
};

export const staffRoutesPlugin = fp(staffRoutes, { name: "staffRoutes", dependencies: ["prisma"] });
