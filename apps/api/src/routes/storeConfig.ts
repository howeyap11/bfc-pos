// apps/api/src/routes/storeConfig.ts
import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { requireStaffHook } from "../plugins/staffGuard.js";

const STORE_ID = "store_1";

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
        };
      }

      const enabledPaymentMethods = JSON.parse(config.enabledPaymentMethods || "[]");
      const paymentMethodOrder = config.paymentMethodOrder ? JSON.parse(config.paymentMethodOrder) : null;

      return {
        storeId: config.storeId,
        enabledPaymentMethods,
        splitPaymentEnabled: config.splitPaymentEnabled ?? true,
        paymentMethodOrder,
      };
    } catch (err) {
      app.log.error({ err }, "[StoreConfig] Error loading config");
      return reply.code(500).send({ error: "STORE_CONFIG_LOAD_FAILED", message: "Failed to load store config" });
    }
  });

  // PUT /store-config - Update store configuration (protected by staff auth)
  app.put(
    "/store-config",
    {
      preHandler: requireStaffHook,
    },
    async (req, reply) => {
      const body = req.body as {
        enabledPaymentMethods?: string[];
        splitPaymentEnabled?: boolean;
        paymentMethodOrder?: string[] | null;
      };

      const updateData: any = {};

      if (body.enabledPaymentMethods !== undefined) {
        updateData.enabledPaymentMethods = JSON.stringify(body.enabledPaymentMethods);
      }

      if (body.splitPaymentEnabled !== undefined) {
        updateData.splitPaymentEnabled = body.splitPaymentEnabled;
      }

      if (body.paymentMethodOrder !== undefined) {
        updateData.paymentMethodOrder = body.paymentMethodOrder ? JSON.stringify(body.paymentMethodOrder) : null;
      }

      const config = await app.prisma.storeConfig.upsert({
        where: { storeId: STORE_ID },
        update: updateData,
        create: {
          storeId: STORE_ID,
          enabledPaymentMethods: JSON.stringify(body.enabledPaymentMethods || ["CASH"]),
          splitPaymentEnabled: body.splitPaymentEnabled ?? true,
          paymentMethodOrder: body.paymentMethodOrder ? JSON.stringify(body.paymentMethodOrder) : null,
        },
      });

      // Parse and return
      return {
        storeId: config.storeId,
        enabledPaymentMethods: JSON.parse(config.enabledPaymentMethods),
        splitPaymentEnabled: config.splitPaymentEnabled,
        paymentMethodOrder: config.paymentMethodOrder ? JSON.parse(config.paymentMethodOrder) : null,
      };
    }
  );
};

export const storeConfigRoutes = fp(storeConfigRoutesImpl, { name: "storeConfigRoutes", dependencies: ["prisma"] });
