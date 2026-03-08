// apps/api/src/routes/qrAccept.ts
import type { FastifyPluginAsync } from "fastify";

const STORE_ID = "store_1";

export const qrAcceptRoutes: FastifyPluginAsync = async (app) => {
  // POST /qr/orders/:id/accept - Accept a QR order
  // Returns different responses based on payment method:
  // - PAYMONGO: Creates Transaction immediately, returns transactionId
  // - CASH: Returns cart payload for cashier to process at register
  app.post(
    "/qr/orders/:id/accept",
    {
      preHandler: app.requireStaff,
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };

      // Fetch the order
      const order = await app.prisma.order.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              item: true,
              options: {
                include: {
                  option: true,
                },
              },
            },
          },
          table: {
            include: {
              zone: true,
            },
          },
        },
      });

      if (!order) {
        return reply.code(404).send({ error: "Order not found" });
      }

      // Check if order is already accepted/completed
      if (order.status !== "PLACED") {
        return reply.code(400).send({ error: "Order already processed" });
      }

      /**
       * QR Order Acceptance Flow:
       * 
       * 1. PAYMONGO (paid online):
       *    - Customer already paid via PayMongo gateway
       *    - Cashier clicks "ACCEPT" to confirm order
       *    - System immediately creates Transaction with payment method = PAYMONGO
       *    - Returns transactionId for receipt/success screen
       * 
       * 2. CASH (pay at counter):
       *    - Customer will pay when picking up order
       *    - Cashier clicks "ACCEPT" to acknowledge order
       *    - System returns cart payload (items, options, prices)
       *    - Cashier processes payment at register (Cash/Card/GCash)
       *    - Transaction created when cashier completes payment
       */

      if (order.paymentMethod === "PAYMONGO") {
        // PAYMONGO Flow: Create Transaction immediately
        
        // Get next transaction number
        const lastTransaction = await app.prisma.transaction.findFirst({
          where: { storeId: STORE_ID },
          orderBy: { transactionNo: "desc" },
          select: { transactionNo: true },
        });
        const nextTransactionNo = (lastTransaction?.transactionNo ?? 0) + 1;

        // Calculate totals
        let subtotalCents = 0;
        const lineItems = order.items.map((orderItem) => {
          const basePrice = orderItem.item.basePrice;
          const modifiersCents = orderItem.options.reduce((sum, opt) => sum + opt.priceDelta, 0);
          const unitPrice = basePrice + modifiersCents;
          const lineTotal = unitPrice * orderItem.qty;
          subtotalCents += lineTotal;

          return {
            itemId: orderItem.itemId,
            name: orderItem.item.name,
            qty: orderItem.qty,
            unitPrice,
            modifiersCents,
            lineTotal,
            note: orderItem.lineNote,
            optionsJson: JSON.stringify(
              orderItem.options.map((opt) => ({
                id: opt.option.id,
                name: opt.option.name,
                priceDelta: opt.priceDelta,
              }))
            ),
          };
        });

        // Create Transaction with PAYMONGO payment
        // Note: orderId links this Transaction to the QR Order for tracking
        // Note: Transaction.source is "POS" for all register transactions (including QR-originated)
        const transaction = await app.prisma.transaction.create({
          data: {
            storeId: STORE_ID,
            transactionNo: nextTransactionNo,
            status: "OPEN",
            source: "POS", // All register transactions use POS source
            orderId: order.id,
            tableId: order.tableId,
            subtotalCents,
            discountCents: 0,
            serviceCents: 0,
            taxCents: 0,
            totalCents: subtotalCents,
            lineItems: {
              create: lineItems,
            },
          },
          include: {
            lineItems: true,
          },
        });

        // Create PAYMONGO payment
        const payment = await app.prisma.transactionPayment.create({
          data: {
            transactionId: transaction.id,
            method: "PAYMONGO",
            status: "PAID",
            amountCents: subtotalCents,
          },
        });

        // Update transaction status to PAID
        await app.prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: "PAID" },
        });

        // Update order status to ACCEPTED
        await app.prisma.order.update({
          where: { id: order.id },
          data: { status: "ACCEPTED" },
        });

        // Log audit
        await app.prisma.auditLog.create({
          data: {
            storeId: STORE_ID,
            action: "REGISTER_CLOSE", // TODO: Add QR_ORDER_ACCEPTED action
            entity: "Order",
            entityId: order.id,
            note: `QR order ${order.orderNo} accepted (PAYMONGO)`,
            metaJson: JSON.stringify({ transactionId: transaction.id, orderId: order.id }),
          },
        });

        return {
          kind: "PAYMONGO_DONE",
          transactionId: transaction.id,
          transactionNo: transaction.transactionNo,
          totalCents: transaction.totalCents,
        };
      } else {
        // CASH Flow: Return cart payload for register processing
        
        // Update order status to ACCEPTED (acknowledged by cashier)
        await app.prisma.order.update({
          where: { id: order.id },
          data: { status: "ACCEPTED" },
        });

        // Build cart payload
        const cartPayload = order.items.map((orderItem) => {
          const basePrice = orderItem.item.basePrice;
          const selectedOptions = orderItem.options.map((opt) => ({
            id: opt.option.id,
            name: opt.option.name,
            priceDelta: opt.priceDelta,
          }));

          return {
            itemId: orderItem.itemId,
            itemName: orderItem.item.name,
            basePrice,
            qty: orderItem.qty,
            selectedOptions,
            note: orderItem.lineNote || "",
          };
        });

        return {
          kind: "CASH_PENDING",
          orderId: order.id,
          orderNo: order.orderNo,
          cartPayload,
        };
      }
    }
  );
};
