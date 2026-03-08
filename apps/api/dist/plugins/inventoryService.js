import fp from "fastify-plugin";
import { createInventoryService } from "../services/inventory.service";
const inventoryServicePlugin = async (app) => {
    const inventoryService = createInventoryService(app.prisma);
    app.decorate("inventoryService", inventoryService);
};
export default fp(inventoryServicePlugin, {
    name: "inventoryService",
    dependencies: ["prisma"],
});
