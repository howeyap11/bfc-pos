import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";
import type { FastifyPluginAsync } from "fastify";

const prisma = new PrismaClient();

const prismaPlugin: FastifyPluginAsync = async (app) => {
  app.decorate("prisma", prisma);

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
};

export default fp(prismaPlugin, { name: "prisma" });
