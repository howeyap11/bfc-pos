import fp from "fastify-plugin";
import { PrismaClient } from "../generated/client2";
const prismaPlugin = async (app) => {
    const prisma = new PrismaClient();
    await prisma.$connect();
    app.decorate("prisma", prisma);
    app.addHook("onClose", async () => {
        await prisma.$disconnect();
    });
};
export default fp(prismaPlugin, { name: "prisma" });
