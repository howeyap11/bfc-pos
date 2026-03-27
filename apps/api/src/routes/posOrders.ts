import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { formatTransactionLineLabel } from "../services/print.service";

const PosOrdersQuery = z.object({
  tab: z.enum(["pending", "qr"]).default("qr"),
});

const STORE_ID = "store_1";

export const posOrdersRoutes: FastifyPluginAsync = async (app) => {
  app.get("/pos/orders", { preHandler: app.requireStaff }, async (req, reply) => {
    const parsed = PosOrdersQuery.safeParse(req.query);
    const tab = parsed.success ? parsed.data.tab : "qr";

    const orders = await app.prisma.order.findMany({
      where: {
        storeId: STORE_ID,
        ...(tab === "qr"
          ? {
              status: "PLACED",
              source: { in: ["QR_UNPAID", "QR_PAYMONGO"] },
            }
          : {
              status: { in: ["PLACED", "ACCEPTED", "IN_PREP", "READY"] },
            }),
      },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: {
        table: { include: { zone: true } },
        items: {
          include: {
            item: {
              include: {
                category: true,
                images: { orderBy: [{ isPrimary: "desc" }, { sort: "asc" }], take: 1 },
              },
            },
            options: { include: { option: { include: { group: true } } } },
          },
        },
      },
    });

    const ordersPayload = orders.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      status: o.status,
      source: o.source,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      customerNote: o.customerNote,
      createdAt: o.createdAt,
      table: o.table
        ? {
            id: o.table.id,
            label: o.table.label,
            zone: o.table.zone ? { code: o.table.zone.code, name: o.table.zone.name } : null,
          }
        : null,
      items: o.items.map((oi) => ({
        id: oi.id,
        qty: oi.qty,
        unitPrice: oi.unitPrice,
        lineNote: oi.lineNote,
        item: oi.item
          ? {
              id: oi.item.id,
              name: oi.item.name,
              category: oi.item.category
                ? { name: oi.item.category.name, prepArea: oi.item.category.prepArea }
                : null,
              imageUrl: oi.item.images[0]?.url ?? null,
            }
          : null,
        options: oi.options.map((opt) => ({
          id: opt.id,
          option: opt.option
            ? { name: opt.option.name, group: opt.option.group ? { name: opt.option.group.name } : null }
            : null,
        })),
      })),
    }));

    // For pending tab, also return PAID transactions that don't have prep completed (pending order cards)
    let pendingTransactions: Array<{
      id: string;
      transactionNo: number;
      status: string;
      source: string;
      createdAt: string;
      createdBy: string | null;
      prepStartedAt: string | null;
      prepReadyAt: string | null;
      table: { id: string; label: string; zone: { code: string; name: string } | null } | null;
      lineItems: Array<{
        id: string;
        qty: number;
        unitPrice: number;
        lineNote: string | null;
        specialInstructions: string | null;
        customerName: string | null;
        name: string;
        optionsJson: string | null;
        categoryName: string | null;
        subCategoryName: string | null;
        displayLabel: string;
        item: { id: string; name: string; imageUrl: string | null; category: { name: string; prepArea: string } | null } | null;
      }>;
    }> = [];

    if (tab === "pending") {
      const txList = await app.prisma.transaction.findMany({
        where: {
          storeId: STORE_ID,
          status: "PAID",
          prepCompletedAt: null,
        },
        orderBy: { createdAt: "asc" },
        take: 100,
        include: {
          table: { select: { id: true, label: true, zone: { select: { code: true, name: true } } } },
          lineItems: {
            include: {
              item: {
                select: {
                  id: true,
                  name: true,
                  category: { select: { name: true, prepArea: true } },
                  images: { orderBy: [{ isPrimary: "desc" }, { sort: "asc" }], take: 1, select: { url: true } },
                },
              },
            },
          },
        },
      });

      pendingTransactions = txList.map((tx) => ({
        id: tx.id,
        transactionNo: tx.transactionNo,
        status: tx.status,
        source: tx.source,
        createdAt: tx.createdAt.toISOString(),
        createdBy: tx.createdBy,
        prepStartedAt: tx.prepStartedAt?.toISOString() ?? null,
        prepReadyAt: tx.prepReadyAt?.toISOString() ?? null,
        table: tx.table
          ? {
              id: tx.table.id,
              label: tx.table.label,
              zone: tx.table.zone ? { code: tx.table.zone.code, name: tx.table.zone.name } : null,
            }
          : null,
        lineItems: tx.lineItems.map((li) => ({
          id: li.id,
          qty: li.qty,
          unitPrice: li.unitPrice,
          lineNote: li.note,
          specialInstructions: li.specialInstructions,
          customerName: li.customerName,
          name: li.name,
          optionsJson: li.optionsJson,
          categoryName: li.categoryName,
          subCategoryName: li.subCategoryName,
          displayLabel: formatTransactionLineLabel({
            name: li.name,
            optionsJson: li.optionsJson,
            categoryName: li.categoryName ?? li.item?.category?.name ?? undefined,
            subCategoryName: li.subCategoryName ?? undefined,
            qty: li.qty,
            includeQuantity: true,
          }),
          item: li.item
            ? {
                id: li.item.id,
                name: li.item.name,
                imageUrl: li.item.images[0]?.url ?? null,
                category: li.item.category ? { name: li.item.category.name, prepArea: li.item.category.prepArea } : null,
              }
            : null,
        })),
      }));
    }

    return { orders: ordersPayload, pendingTransactions };
  });

  // Mark a transaction's prep as complete (attach prep time to transaction)
  app.patch("/pos/transactions/:id/prep-complete", { preHandler: app.requireStaff }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const transaction = await app.prisma.transaction.findFirst({
      where: { id, storeId: STORE_ID, status: "PAID" },
    });
    if (!transaction) {
      reply.code(404);
      return { error: "Transaction not found or not paid" };
    }
    await app.prisma.transaction.update({
      where: { id },
      data: { prepCompletedAt: new Date() },
    });
    return { ok: true };
  });

  /** KDS: advance PAID transaction one step — new → preparing → ready → completed (same local row). */
  app.patch("/pos/transactions/:id/kds-bump", { preHandler: app.requireStaff }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const transaction = await app.prisma.transaction.findFirst({
      where: { id, storeId: STORE_ID, status: "PAID", prepCompletedAt: null },
    });
    if (!transaction) {
      reply.code(404);
      return { error: "Transaction not found or already bumped off" };
    }
    const now = new Date();
    if (!transaction.prepStartedAt) {
      await app.prisma.transaction.update({ where: { id }, data: { prepStartedAt: now } });
      return { ok: true, stage: "IN_PREP" };
    }
    if (!transaction.prepReadyAt) {
      await app.prisma.transaction.update({ where: { id }, data: { prepReadyAt: now } });
      return { ok: true, stage: "READY" };
    }
    await app.prisma.transaction.update({ where: { id }, data: { prepCompletedAt: now } });
    return { ok: true, stage: "COMPLETED" };
  });
};
