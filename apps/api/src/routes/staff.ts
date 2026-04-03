// apps/api/src/routes/staff.ts
import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import { verifyAdminPin } from "../services/adminPin.service.js";
import { verifyStaffPin } from "../lib/staffPin.js";

const STORE_ID = "store_1";

async function ensureStaffAuthKey(prisma: PrismaClient, staffId: string): Promise<string> {
  const row = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { key: true },
  });
  if (row?.key) return row.key as string;
  const newKey = "staff_" + randomBytes(16).toString("hex");
  await prisma.staff.update({
    where: { id: staffId },
    data: { key: newKey },
  });
  return newKey;
}

const staffRoutes: FastifyPluginAsync = async (app) => {
  // GET /staff — synced staff roster for POS picker (no PIN or hash exposed)
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
        email: true,
        role: true,
        key: true,
        isActive: true,
      },
    });

    return staff;
  });

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

  // POST /staff/login — POS tablet: staffId + PIN; verified locally against synced hash or legacy passcode
  app.post("/staff/login", async (req, reply) => {
    const body = req.body as { staffId: string; passcode: string };

    if (!body.staffId || body.passcode == null) {
      return reply.code(400).send({ error: "MISSING_FIELDS" });
    }

    const staff = await app.prisma.staff.findUnique({
      where: { id: body.staffId },
      select: {
        id: true,
        name: true,
        role: true,
        email: true,
        passcode: true,
        passcodeHash: true,
        key: true,
        cloudId: true,
        isActive: true,
      },
    });

    if (!staff || !staff.isActive) {
      return reply.code(404).send({ error: "STAFF_NOT_FOUND" });
    }

    if (!verifyStaffPin(body.passcode, staff.passcodeHash, staff.passcode)) {
      return reply.code(401).send({ error: "INVALID_PASSCODE" });
    }

    const key = await ensureStaffAuthKey(app.prisma, staff.id);

    return {
      id: staff.id,
      name: staff.name,
      role: staff.role,
      email: staff.email ?? null,
      cloudId: staff.cloudId ?? null,
      key,
    };
  });

  // POST /staff/login-email — staff phone app: email + PIN; same local verification, no cloud call
  app.post("/staff/login-email", async (req, reply) => {
    const body = req.body as { email: string; passcode: string };
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    if (!email || body.passcode == null) {
      return reply.code(400).send({ error: "MISSING_FIELDS" });
    }

    const candidates = await app.prisma.staff.findMany({
      where: { storeId: STORE_ID, isActive: true, email: { not: null } },
      select: {
        id: true,
        name: true,
        role: true,
        email: true,
        passcode: true,
        passcodeHash: true,
        key: true,
        cloudId: true,
        isActive: true,
      },
    });
    const staff = candidates.find((s) => String(s.email ?? "").trim().toLowerCase() === email) ?? null;

    if (!staff) {
      return reply.code(401).send({ error: "INVALID_CREDENTIALS", message: "Invalid email or PIN" });
    }

    if (!verifyStaffPin(body.passcode, staff.passcodeHash, staff.passcode)) {
      return reply.code(401).send({ error: "INVALID_CREDENTIALS", message: "Invalid email or PIN" });
    }

    const key = await ensureStaffAuthKey(app.prisma, staff.id);

    return {
      id: staff.id,
      name: staff.name,
      role: staff.role,
      email: staff.email ?? null,
      cloudId: staff.cloudId ?? null,
      key,
    };
  });
};

export const staffRoutesPlugin = fp(staffRoutes, { name: "staffRoutes", dependencies: ["prisma"] });
