import type { PrismaClient } from "../generated/prisma/index.js";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

