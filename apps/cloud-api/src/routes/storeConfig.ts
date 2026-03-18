/**
 * Store config proxy for Cloud Admin (Settings > Business Details).
 * When POS_BACKEND_URL is set, GET/PUT proxy to the POS backend so business name and address
 * are stored in the same StoreConfig the POS uses for receipts.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

const DEFAULT_CONFIG = {
  storeId: "store_1",
  businessName: null as string | null,
  address: null as string | null,
  enabledPaymentMethods: ["CASH"],
  splitPaymentEnabled: true,
  paymentMethodOrder: null,
  stickerPrintCategoryIds: [] as string[],
};

function getPosBackendUrl(): string | null {
  const url = process.env.POS_BACKEND_URL;
  return typeof url === "string" && url.trim().length > 0 ? url.trim().replace(/\/$/, "") : null;
}

async function requireJwt(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "UNAUTHORIZED", message: "Authentication required" });
  }
}

export async function storeConfigRoutes(app: FastifyInstance) {
  const base = getPosBackendUrl();
  const adminKey = process.env.STORE_CONFIG_ADMIN_KEY ?? "";

  app.get("/store-config", { preHandler: requireJwt }, async (req, reply) => {
    if (!base) {
      return reply.send(DEFAULT_CONFIG);
    }
    try {
      const res = await fetch(`${base}/store-config`, { method: "GET", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) return reply.code(res.status).send(data);
      return reply.send(data);
    } catch (err) {
      app.log.warn({ err }, "[store-config] GET proxy failed");
      return reply.code(502).send({ error: "PROXY_FAILED", message: "Could not reach POS backend" });
    }
  });

  app.put("/store-config", { preHandler: requireJwt }, async (req, reply) => {
    if (!base) {
      return reply.code(503).send({
        error: "POS_BACKEND_NOT_CONFIGURED",
        message: "Set POS_BACKEND_URL and STORE_CONFIG_ADMIN_KEY to save business details from Cloud Admin.",
      });
    }
    const body = req.body as Record<string, unknown>;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (adminKey) headers["x-store-config-admin-key"] = adminKey;
    try {
      const res = await fetch(`${base}/store-config`, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) return reply.code(res.status).send(data);
      return reply.send(data);
    } catch (err) {
      app.log.warn({ err }, "[store-config] PUT proxy failed");
      return reply.code(502).send({ error: "PROXY_FAILED", message: "Could not reach POS backend" });
    }
  });
}
