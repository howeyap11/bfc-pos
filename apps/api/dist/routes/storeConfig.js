const STORE_ID = "store_1";
export const storeConfigRoutes = async (app) => {
    // GET /store-config - Get store configuration (public, no auth required)
    app.get("/store-config", async (req, reply) => {
        const config = await app.prisma.storeConfig.findUnique({
            where: { storeId: STORE_ID },
        });
        if (!config) {
            return reply.code(404).send({ error: "Store config not found" });
        }
        // Parse JSON fields
        const enabledPaymentMethods = JSON.parse(config.enabledPaymentMethods);
        const paymentMethodOrder = config.paymentMethodOrder ? JSON.parse(config.paymentMethodOrder) : null;
        return {
            storeId: config.storeId,
            enabledPaymentMethods,
            splitPaymentEnabled: config.splitPaymentEnabled,
            paymentMethodOrder,
        };
    });
    // PUT /store-config - Update store configuration (protected by staff auth)
    app.put("/store-config", {
        preHandler: app.requireStaff,
    }, async (req, reply) => {
        const body = req.body;
        const updateData = {};
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
    });
};
