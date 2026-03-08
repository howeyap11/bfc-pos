import Fastify from "fastify";
import cors from "@fastify/cors";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: true,
  credentials: true,
});

app.get("/health", async () => ({ ok: true, ts: Date.now() }));

await app.listen({ host: "0.0.0.0", port: 3000 });
