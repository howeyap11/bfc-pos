import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const prismaPlugin = async (app) => {
    app.decorate("prisma", prisma);
    app.addHook("onClose", async () => {
        await prisma.$disconnect();
    });
};
export default fp(prismaPlugin, { name: "prisma" });
