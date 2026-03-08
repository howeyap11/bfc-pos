import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { createInventoryService } from "../services/inventory.service.js";

declare module "fastify" {
  interface FastifyInstance {
    inventoryService: ReturnType<typeof createInventoryService>;
  }
}

export default fp(async (app: FastifyInstance) => {
  app.decorate("inventoryService", createInventoryService(app.prisma));
}, {
  name: "inventory",
  dependencies: ["prisma"],
});
