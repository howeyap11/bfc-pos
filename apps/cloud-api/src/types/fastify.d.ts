import type { PrismaClient } from "@prisma/client";
import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; email: string; role?: "ADMIN" | "MANAGER" };
    user: { sub: string; email: string; role?: "ADMIN" | "MANAGER" };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

