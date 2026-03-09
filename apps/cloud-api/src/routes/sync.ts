import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";

const syncSecret = process.env.STORE_SYNC_SECRET ?? "";

const transactionImportSchema = z.object({
  storeId: z.string().min(1),
  sourceTransactionId: z.string().min(1),
  transactionNo: z.number().int().positive(),
  status: z.enum(["PAID", "VOID"]),
  source: z.string().default("POS"),
  serviceType: z.string().default("DINE_IN"),
  cashierName: z.string().nullable().optional(),
  totalCents: z.number().int(),
  subtotalCents: z.number().int().default(0),
  discountCents: z.number().int().default(0),
  itemsCount: z.number().int().min(0).default(0),
  payments: z.array(z.object({
    method: z.string(),
    amountCents: z.number().int(),
  })),
  lineItems: z.array(z.object({
    name: z.string(),
    qty: z.number().int(),
    lineTotal: z.number().int(),
  })).optional(),
  createdAt: z.string(), // ISO date
  voidedAt: z.string().nullable().optional(),
  voidReason: z.string().nullable().optional(),
});

export async function syncRoutes(app: FastifyInstance) {
  app.get(
    "/catalog",
    async (req: FastifyRequest<{ Querystring: { sinceVersion?: string } }>, reply: FastifyReply) => {
      const sinceVersion = parseInt(req.query.sinceVersion ?? "0", 10);
      if (!Number.isFinite(sinceVersion) || sinceVersion < 0) {
        reply.code(400);
        return { error: "INVALID_SINCE_VERSION" };
      }

      const [
        catalogVersion,
        items,
        ingredients,
        recipeLines,
        categories,
        subCategories,
        menuOptionGroups,
        menuOptions,
        menuOptionGroupSections,
        menuItemOptionGroups,
        menuItemSizes,
        menuSizes,
        menuItemSizePrices,
      ] = await Promise.all([
        app.prisma.catalogVersion.findUnique({ where: { id: 1 } }),
        app.prisma.menuItem.findMany({
          where: { version: { gt: sinceVersion } },
          include: {
            drinkSizeConfigs: { include: { option: true } },
            drinkModeDefaults: { include: { option: true } },
          },
        }),
        app.prisma.ingredient.findMany({ where: { version: { gt: sinceVersion } } }),
        app.prisma.recipeLine.findMany({ where: { version: { gt: sinceVersion } } }),
        app.prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
        app.prisma.subCategory.findMany({ orderBy: { sortOrder: "asc" } }),
        app.prisma.menuOptionGroup.findMany(),
        app.prisma.menuOption.findMany({ orderBy: [{ groupId: "asc" }, { sortOrder: "asc" }] }),
        app.prisma.menuOptionGroupSection.findMany({ orderBy: [{ optionGroupId: "asc" }, { sortOrder: "asc" }] }),
        app.prisma.menuItemOptionGroup.findMany(),
        app.prisma.menuItemSize.findMany({ where: { isActive: true } }),
        app.prisma.menuSize.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        }),
        app.prisma.menuItemSizePrice.findMany(),
      ]);

      const latestVersion = catalogVersion?.latestVersion ?? 0;

      return {
        latestVersion,
        items: items.map((i) => ({
          ...i,
          deletedAt: i.deletedAt?.toISOString() ?? null,
          defaultSizeId: i.defaultSizeId,
          defaultSizeOptionId: i.defaultSizeOptionId,
          drinkSizeConfigs: i.drinkSizeConfigs?.map((c) => ({
            id: c.id,
            menuItemId: c.menuItemId,
            mode: c.mode,
            optionId: c.optionId,
            isEnabled: c.isEnabled,
            option: c.option ? { id: c.option.id, name: c.option.name } : undefined,
          })) ?? [],
          drinkModeDefaults: i.drinkModeDefaults?.map((d) => ({
            id: d.id,
            menuItemId: d.menuItemId,
            mode: d.mode,
            defaultOptionId: d.defaultOptionId,
            option: d.option ? { id: d.option.id, name: d.option.name } : undefined,
          })) ?? [],
        })),
        ingredients: ingredients.map((i) => ({
          ...i,
          deletedAt: i.deletedAt?.toISOString() ?? null,
        })),
        recipeLines: recipeLines.map((r) => ({
          ...r,
          qtyPerItem: r.qtyPerItem.toString(),
          deletedAt: r.deletedAt?.toISOString() ?? null,
        })),
        categories: categories.map((c) => ({ ...c, deletedAt: c.deletedAt?.toISOString() ?? null })),
        subCategories: subCategories.map((s) => ({ ...s, deletedAt: s.deletedAt?.toISOString() ?? null })),
        menuOptionGroups,
        menuOptions,
        menuOptionGroupSections,
        menuItemOptionGroups,
        menuItemSizes,
        menuSizes: menuSizes.map((s) => ({
          id: s.id,
          label: s.label,
          sortOrder: s.sortOrder,
        })),
        menuItemSizePrices: menuItemSizePrices.map((p) => ({
          id: p.id,
          menuItemId: p.menuItemId,
          baseType: p.baseType,
          sizeOptionId: p.sizeOptionId,
          sizeCode: p.sizeCode,
          priceCents: p.priceCents,
        })),
      };
    }
  );

  // Import transaction from POS (idempotent)
  app.post("/transactions", async (req: FastifyRequest, reply: FastifyReply) => {
    if (syncSecret) {
      const key = (req.headers["x-store-sync-key"] as string) || "";
      if (key !== syncSecret) {
        reply.code(401);
        return { error: "UNAUTHORIZED", message: "Invalid or missing X-Store-Sync-Key" };
      }
    }
    const parsed = transactionImportSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "INVALID_BODY", details: parsed.error.flatten(), message: "Invalid transaction payload" };
    }
    const d = parsed.data;
    const paymentsJson = JSON.stringify(d.payments);
    const lineItemsSummaryJson = d.lineItems ? JSON.stringify(d.lineItems) : null;
    const createdAt = new Date(d.createdAt);
    const voidedAt = d.voidedAt ? new Date(d.voidedAt) : null;
    try {
      const existing = await app.prisma.syncedTransaction.findUnique({
        where: { sourceTransactionId: d.sourceTransactionId },
      });
      if (existing) {
        await app.prisma.syncedTransaction.update({
          where: { id: existing.id },
          data: {
            status: d.status,
            voidedAt,
            voidReason: d.voidReason ?? null,
          },
        });
        app.log.debug({ sourceTransactionId: d.sourceTransactionId }, "[Sync] Transaction updated (void/sync)");
        return { ok: true, imported: false, id: existing.id };
      }
      const created = await app.prisma.syncedTransaction.create({
        data: {
          storeId: d.storeId,
          sourceTransactionId: d.sourceTransactionId,
          transactionNo: d.transactionNo,
          status: d.status,
          source: d.source,
          serviceType: d.serviceType,
          cashierName: d.cashierName ?? null,
          totalCents: d.totalCents,
          subtotalCents: d.subtotalCents,
          discountCents: d.discountCents,
          itemsCount: d.itemsCount,
          paymentsJson,
          lineItemsSummaryJson,
          createdAt,
          voidedAt,
          voidReason: d.voidReason ?? null,
        },
      });
      app.log.info({ id: created.id, transactionNo: d.transactionNo }, "[Sync] Transaction imported");
      return { ok: true, imported: true, id: created.id };
    } catch (err) {
      app.log.error({ err, sourceTransactionId: d.sourceTransactionId }, "[Sync] Failed to import transaction");
      reply.code(500);
      return { error: "IMPORT_FAILED", message: "Failed to import transaction" };
    }
  });
}
