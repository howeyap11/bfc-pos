// apps/api/src/routes/storeConfig.ts
import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { requireStaffHook } from "../plugins/staffGuard.js";

const STORE_ID = "store_1";

/** Allow PUT if either staff auth or cloud admin key (for Settings > Business Details). */
async function allowStaffOrStoreConfigAdmin(req: FastifyRequest, reply: FastifyReply) {
  const adminKey = process.env.STORE_CONFIG_ADMIN_KEY;
  const incoming = (req.headers["x-store-config-admin-key"] as string) ?? "";
  const keyMatch = typeof adminKey === "string" && adminKey.length > 0 && incoming.trim() === adminKey.trim();
  if (keyMatch) return;
  await requireStaffHook(req, reply);
}

const storeConfigRoutesImpl: FastifyPluginAsync = async (app) => {
  // GET /store-config - Get store configuration (public, no auth required)
  app.get("/store-config", async (req, reply) => {
    try {
      const config = await app.prisma.storeConfig.findUnique({
        where: { storeId: STORE_ID },
      });

      if (!config) {
        return {
          storeId: STORE_ID,
          enabledPaymentMethods: ["CASH"],
          splitPaymentEnabled: true,
          paymentMethodOrder: null,
          stickerPrintCategoryIds: [] as string[],
          businessName: null as string | null,
          address: null as string | null,
        };
      }

      const enabledPaymentMethods = JSON.parse(config.enabledPaymentMethods || "[]");
      const paymentMethodOrder = config.paymentMethodOrder ? JSON.parse(config.paymentMethodOrder) : null;
      const stickerPrintCategoryIds = config.stickerPrintCategoryIds
        ? (JSON.parse(config.stickerPrintCategoryIds) as string[])
        : [];

      return {
        storeId: config.storeId,
        enabledPaymentMethods,
        splitPaymentEnabled: config.splitPaymentEnabled ?? true,
        paymentMethodOrder,
        stickerPrintCategoryIds,
        businessName: config.businessName ?? null,
        address: config.address ?? null,
      };
    } catch (err) {
      app.log.error({ err }, "[StoreConfig] Error loading config");
      return reply.code(500).send({ error: "STORE_CONFIG_LOAD_FAILED", message: "Failed to load store config" });
    }
  });

  // PUT /store-config - Update store configuration (staff auth or cloud admin key)
  app.put(
    "/store-config",
    {
      preHandler: allowStaffOrStoreConfigAdmin,
    },
    async (req, reply) => {
      const body = req.body as {
        enabledPaymentMethods?: string[];
        splitPaymentEnabled?: boolean;
        paymentMethodOrder?: string[] | null;
        stickerPrintCategoryIds?: string[] | null;
        businessName?: string | null;
        address?: string | null;
      };

      const updateData: Record<string, unknown> = {};

      if (body.enabledPaymentMethods !== undefined) {
        updateData.enabledPaymentMethods = JSON.stringify(body.enabledPaymentMethods);
      }

      if (body.splitPaymentEnabled !== undefined) {
        updateData.splitPaymentEnabled = body.splitPaymentEnabled;
      }

      if (body.paymentMethodOrder !== undefined) {
        updateData.paymentMethodOrder = body.paymentMethodOrder ? JSON.stringify(body.paymentMethodOrder) : null;
      }

      if (body.stickerPrintCategoryIds !== undefined) {
        updateData.stickerPrintCategoryIds = Array.isArray(body.stickerPrintCategoryIds)
          ? JSON.stringify(body.stickerPrintCategoryIds)
          : null;
      }

      if (body.businessName !== undefined) {
        updateData.businessName = body.businessName?.trim() || null;
      }

      if (body.address !== undefined) {
        updateData.address = body.address?.trim() || null;
      }

      const config = await app.prisma.storeConfig.upsert({
        where: { storeId: STORE_ID },
        update: updateData,
        create: {
          storeId: STORE_ID,
          enabledPaymentMethods: JSON.stringify(body.enabledPaymentMethods || ["CASH"]),
          splitPaymentEnabled: body.splitPaymentEnabled ?? true,
          paymentMethodOrder: body.paymentMethodOrder ? JSON.stringify(body.paymentMethodOrder) : null,
          stickerPrintCategoryIds: Array.isArray(body.stickerPrintCategoryIds)
            ? JSON.stringify(body.stickerPrintCategoryIds)
            : null,
          businessName: body.businessName?.trim() || null,
          address: body.address?.trim() || null,
        },
      });

      const stickerPrintCategoryIds = config.stickerPrintCategoryIds
        ? (JSON.parse(config.stickerPrintCategoryIds) as string[])
        : [];

      return {
        storeId: config.storeId,
        enabledPaymentMethods: JSON.parse(config.enabledPaymentMethods),
        splitPaymentEnabled: config.splitPaymentEnabled,
        paymentMethodOrder: config.paymentMethodOrder ? JSON.parse(config.paymentMethodOrder) : null,
        stickerPrintCategoryIds,
        businessName: config.businessName ?? null,
        address: config.address ?? null,
      };
    }
  );
};

export const storeConfigRoutes = fp(storeConfigRoutesImpl, { name: "storeConfigRoutes", dependencies: ["prisma"] });
