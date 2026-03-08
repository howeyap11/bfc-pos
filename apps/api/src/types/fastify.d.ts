import "fastify";
import type { PrismaClient } from "@prisma/client";
import type { InventoryService } from "../services/inventory.service";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    inventoryService: InventoryService;
    requireStaff: (req: any, reply: any) => Promise<void> | void;
  }
}
