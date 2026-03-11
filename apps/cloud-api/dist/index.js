import "dotenv/config";
import Fastify from "fastify";
import { logR2Status } from "./services/r2.service.js";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import prismaPlugin from "./plugins/prisma.js";
import inventoryPlugin from "./plugins/inventory.js";
import { authRoutes } from "./routes/auth.js";
import { adminRoutes } from "./routes/admin.js";
import { syncRoutes } from "./routes/sync.js";
const app = Fastify({ logger: true });
app.setErrorHandler((err, _req, reply) => {
    app.log.error(err);
    const status = err.statusCode ?? 500;
    const message = err instanceof Error ? err.message : String(err);
    reply.status(status).send({
        ok: false,
        message: message || "Internal server error",
        error: message,
    });
});
await app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Store-Sync-Key"],
});
await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
});
await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB
await app.register(prismaPlugin);
await app.register(inventoryPlugin);
logR2Status(app.log);
app.get("/health", async () => ({ ok: true, ts: Date.now() }));
await app.register(authRoutes, { prefix: "/auth" });
await app.register(adminRoutes, { prefix: "/admin" });
await app.register(syncRoutes, { prefix: "/sync" });
const port = parseInt(process.env.PORT ?? "4000", 10);
await app.listen({ host: "0.0.0.0", port });
