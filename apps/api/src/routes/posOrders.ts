import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { formatTransactionLineLabel } from "../services/print.service";

const PosOrdersQuery = z.object({
  tab: z.enum(["pending", "qr"]).default("qr"),
});

const STORE_ID = "store_1";

async function itemCloudIdToCategoryCloudIdMap(
  prisma: {
    cloudMenuItem: {
      findMany: (args: {
        where: { storeId: string; cloudId: { in: string[] } };
        select: { cloudId: true; categoryCloudId: true };
      }) => Promise<Array<{ cloudId: string; categoryCloudId: string | null }>>;
    };
  },
  storeId: string,
  itemCloudIds: string[]
): Promise<Map<string, string | null>> {
  const m = new Map<string, string | null>();
  if (itemCloudIds.length === 0) return m;
  const rows = await prisma.cloudMenuItem.findMany({
    where: { storeId, cloudId: { in: itemCloudIds } },
    select: { cloudId: true, categoryCloudId: true },
  });
  for (const r of rows) m.set(r.cloudId, r.categoryCloudId ?? null);
  return m;
}

/** Same shape as pending tab transaction cards (for standalone tx list or order.linkedTransaction). */
function pendingTransactionCardFromPrisma(
  tx: {
    id: string;
    transactionNo: number;
    status: string;
    source: string;
    createdAt: Date;
    createdBy: string | null;
    prepStartedAt: Date | null;
    prepReadyAt: Date | null;
    serviceType: string;
    table: { id: string; label: string; zone: { code: string; name: string } | null } | null;
    lineItems: Array<{
      id: string;
      qty: number;
      unitPrice: number;
      note: string | null;
      specialInstructions: string | null;
      customerName: string | null;
      name: string;
      optionsJson: string | null;
      categoryName: string | null;
      subCategoryName: string | null;
      item: {
        id: string;
        name: string;
        cloudId: string | null;
        images: Array<{ url: string }>;
        category: { id: string; name: string; prepArea: string } | null;
      } | null;
    }>;
  },
  itemCloudToCategoryCloud: Map<string, string | null>
) {
  return {
    id: tx.id,
    transactionNo: tx.transactionNo,
    status: tx.status,
    source: tx.source,
    createdAt: tx.createdAt.toISOString(),
    createdBy: tx.createdBy,
    prepStartedAt: tx.prepStartedAt?.toISOString() ?? null,
    prepReadyAt: tx.prepReadyAt?.toISOString() ?? null,
    serviceType: tx.serviceType,
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
            category: li.item.category
              ? {
                  id: li.item.category.id,
                  name: li.item.category.name,
                  prepArea: li.item.category.prepArea,
                  cloudCategoryId: li.item.cloudId ? itemCloudToCategoryCloud.get(li.item.cloudId) ?? null : null,
                }
              : null,
          }
        : null,
    })),
  };
}

export const posOrdersRoutes: FastifyPluginAsync = async (app) => {
  /** Synced cloud categories (local DB mirror). IDs are stable cloudIds — matches kitchen filter + CloudMenuItem.categoryCloudId. */
  app.get("/pos/catalog-categories", { preHandler: app.requireStaff }, async (_req, _reply) => {
    const rows = await app.prisma.cloudCategory.findMany({
      where: { storeId: STORE_ID },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { cloudId: true, name: true },
    });
    return { categories: rows.map((r) => ({ id: r.cloudId, name: r.name })) };
  });

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
              select: {
                id: true,
                name: true,
                cloudId: true,
                category: true,
                images: { orderBy: [{ isPrimary: "desc" }, { sort: "asc" }], take: 1 },
              },
            },
            options: { include: { option: { include: { group: true } } } },
          },
        },
        ...(tab === "pending"
          ? {
              transaction: {
                include: {
                  table: { select: { id: true, label: true, zone: { select: { code: true, name: true } } } },
                  lineItems: {
                    include: {
                      item: {
                        select: {
                          id: true,
                          name: true,
                          cloudId: true,
                          category: { select: { id: true, name: true, prepArea: true } },
                          images: { orderBy: [{ isPrimary: "desc" }, { sort: "asc" }], take: 1, select: { url: true } },
                        },
                      },
                    },
                  },
                },
              },
            }
          : {}),
      },
    });

    const pendingTxRows =
      tab === "pending"
        ? await app.prisma.transaction.findMany({
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
                      cloudId: true,
                      category: { select: { id: true, name: true, prepArea: true } },
                      images: { orderBy: [{ isPrimary: "desc" }, { sort: "asc" }], take: 1, select: { url: true } },
                    },
                  },
                },
              },
            },
          })
        : [];

    const itemCloudIds = new Set<string>();
    for (const o of orders) {
      for (const oi of o.items) {
        const cid = oi.item?.cloudId;
        if (cid) itemCloudIds.add(cid);
      }
      if (tab === "pending" && "transaction" in o && o.transaction) {
        const linkedTx = o.transaction as unknown as { lineItems: Array<{ item: { cloudId: string | null } | null }> };
        for (const li of linkedTx.lineItems) {
          const cid = li.item?.cloudId;
          if (cid) itemCloudIds.add(cid);
        }
      }
    }
    for (const tx of pendingTxRows) {
      for (const li of tx.lineItems) {
        const cid = li.item?.cloudId;
        if (cid) itemCloudIds.add(cid);
      }
    }
    const itemCloudToCategoryCloud = await itemCloudIdToCategoryCloudIdMap(
      app.prisma,
      STORE_ID,
      [...itemCloudIds]
    );

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
                ? {
                    id: oi.item.category.id,
                    name: oi.item.category.name,
                    prepArea: oi.item.category.prepArea,
                    cloudCategoryId: oi.item.cloudId ? itemCloudToCategoryCloud.get(oi.item.cloudId) ?? null : null,
                  }
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
      linkedTransaction:
        tab === "pending" && "transaction" in o && o.transaction
          ? pendingTransactionCardFromPrisma(
              o.transaction as unknown as Parameters<typeof pendingTransactionCardFromPrisma>[0],
              itemCloudToCategoryCloud
            )
          : null,
    }));

    const pendingTransactions =
      tab === "pending"
        ? pendingTxRows.map((tx) => pendingTransactionCardFromPrisma(tx, itemCloudToCategoryCloud))
        : [];

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
