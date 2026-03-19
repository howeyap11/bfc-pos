import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";
// SQLite: longer timeouts and single connection to avoid P1008 / socket timeout under load
function sqliteUrlWithTimeout(url) {
    if (!url.startsWith("file:"))
        return url;
    const base = url.split("?")[0];
    const params = new URLSearchParams(url.includes("?") ? url.split("?")[1] : "");
    params.set("connection_limit", "1");
    params.set("connect_timeout", "30");
    params.set("socket_timeout", "30"); // Prisma SQLite per-query timeout (default 5s); P1008 fix
    return `${base}?${params.toString()}`;
}
const rawUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const datasourceUrl = rawUrl.startsWith("file:") ? sqliteUrlWithTimeout(rawUrl) : rawUrl;
const prismaOptions = datasourceUrl !== rawUrl ? { datasources: { db: { url: datasourceUrl } } } : undefined;
const prisma = new PrismaClient(prismaOptions);
// Single instance identity for write-lock visibility logging (detect multiple clients)
prisma._bfcInstanceId = `prisma-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
function disconnectOnShutdown() {
    prisma.$disconnect().catch(() => { });
}
const prismaPlugin = async (app) => {
    // SQLite: PRAGMA returns results in SQLite — must use $queryRawUnsafe, not $executeRaw (P2010)
    if (rawUrl.startsWith("file:")) {
        await prisma.$connect();
        try {
            await prisma.$queryRawUnsafe("PRAGMA busy_timeout=30000");
        }
        catch (pragmaErr) {
            // Don't break startup if PRAGMA fails (e.g. driver quirk)
            console.warn("[prisma] PRAGMA busy_timeout failed:", pragmaErr);
        }
    }
    app.decorate("prisma", prisma);
    app.addHook("onClose", async () => {
        await prisma.$disconnect();
    });
    // Release SQLite file lock on process shutdown (e.g. Ctrl+C, taskkill) so migrate reset can run
    process.once("SIGINT", disconnectOnShutdown);
    process.once("SIGTERM", disconnectOnShutdown);
};
export default fp(prismaPlugin, { name: "prisma" });
