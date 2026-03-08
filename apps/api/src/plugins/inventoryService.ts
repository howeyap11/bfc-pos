import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { createInventoryService } from "../services/inventory.service";

const inventoryServicePlugin: FastifyPluginAsync = async (app) => {
  const inventoryService = createInventoryService(app.prisma);
  app.decorate("inventoryService", inventoryService);
};

export default fp(inventoryServicePlugin, {
  name: "inventoryService",
  dependencies: ["prisma"],
});
