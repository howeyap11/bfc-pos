import "fastify";
import "@fastify/multipart";
import type { PrismaClient } from "@prisma/client";
import type { InventoryService } from "../services/inventory.service";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    inventoryService: InventoryService;
    requireStaff: (req: any, reply: any) => Promise<void> | void;
    /** Missing x-staff-key allowed; invalid key still 401. For tablet/kiosk display routes only. */
    optionalStaff: (req: any, reply: any) => Promise<void> | void;
  }
}
