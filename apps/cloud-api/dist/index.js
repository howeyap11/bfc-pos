import "dotenv/config";
import { join } from "node:path";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import prismaPlugin from "./plugins/prisma.js";
import { authRoutes } from "./routes/auth.js";
import { adminRoutes } from "./routes/admin.js";
import { syncRoutes } from "./routes/sync.js";
const app = Fastify({ logger: true });
await app.register(cors, { origin: true });
await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
});
await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB
await app.register(fastifyStatic, {
    root: join(process.cwd(), "uploads"),
    prefix: "/uploads/",
});
await app.register(prismaPlugin);
app.get("/health", async () => ({ ok: true, ts: Date.now() }));
await app.register(authRoutes, { prefix: "/auth" });
await app.register(adminRoutes, { prefix: "/admin" });
await app.register(syncRoutes, { prefix: "/sync" });
const port = parseInt(process.env.PORT ?? "4000", 10);
await app.listen({ host: "0.0.0.0", port });
