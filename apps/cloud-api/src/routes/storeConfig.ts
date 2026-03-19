/**
 * Settings > Business Details. Stored in cloud-api DB like other settings (e.g. menu settings).
 * GET/PUT require JWT. No proxy, no POS_BACKEND_URL.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

const STORE_ID = "store_1";
const BUSINESS_DETAILS_ID = "1";

async function requireJwt(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "UNAUTHORIZED", message: "Authentication required" });
  }
}

export async function storeConfigRoutes(app: FastifyInstance) {
  app.get("/store-config", { preHandler: requireJwt }, async (_req, reply) => {
    const row = await app.prisma.businessDetails.findUnique({
      where: { id: BUSINESS_DETAILS_ID },
    });
    return reply.send({
      storeId: STORE_ID,
      businessName: row?.businessName ?? null,
      address: row?.address ?? null,
      enabledPaymentMethods: ["CASH"],
      splitPaymentEnabled: true,
      paymentMethodOrder: null,
      stickerPrintCategoryIds: [] as string[],
    });
  });

  app.put("/store-config", { preHandler: requireJwt }, async (req, reply) => {
    const body = req.body as { businessName?: string | null; address?: string | null };
    const businessName = body.businessName != null ? (String(body.businessName).trim() || null) : undefined;
    const address = body.address != null ? (String(body.address).trim() || null) : undefined;

    const row = await app.prisma.businessDetails.upsert({
      where: { id: BUSINESS_DETAILS_ID },
      update: {
        ...(businessName !== undefined && { businessName }),
        ...(address !== undefined && { address }),
      },
      create: {
        id: BUSINESS_DETAILS_ID,
        businessName: businessName ?? null,
        address: address ?? null,
      },
    });

    return reply.send({
      storeId: STORE_ID,
      businessName: row.businessName ?? null,
      address: row.address ?? null,
      enabledPaymentMethods: ["CASH"],
      splitPaymentEnabled: true,
      paymentMethodOrder: null,
      stickerPrintCategoryIds: [] as string[],
    });
  });
}
