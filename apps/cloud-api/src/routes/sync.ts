import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { verifyPassword } from "../lib/password.js";

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

      // Bootstrap (sinceVersion 0): return all entities. Incremental: only version > sinceVersion.
      const versionFilter = sinceVersion === 0 ? { gte: 0 } : { gt: sinceVersion };

      const [
        catalogVersion,
        items,
        addOnGroups,
        substituteGroups,
        substitutes,
        substitutePrices,
        substituteRecipeConsumptions,
        menuItemAddOnGroups,
        menuItemSubstituteGroups,
        menuItemSubstitutes,
        ingredientsVersioned,
        recipeLinesVersioned,
        recipeLineSizesVersioned,
        categories,
        subCategories,
        menuOptionGroups,
        menuOptions,
        menuOptionGroupSections,
        menuItemOptionGroups,
        menuItemSizes,
        menuSizes,
        menuItemSizePrices,
        transactionTypes,
        shotPricingRules,
        storeSetting,
      ] = await Promise.all([
        app.prisma.catalogVersion.findUnique({ where: { id: 1 } }),
        app.prisma.menuItem.findMany({
          where: { version: versionFilter },
          include: {
            drinkSizeConfigs: { include: { option: true } },
            drinkModeDefaults: { include: { option: true } },
          },
        }),
        app.prisma.addOnGroup.findMany({ where: { isActive: true }, include: { options: { where: { isActive: true }, include: { recipeLines: { include: { ingredient: true } } }, orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } }),
        app.prisma.substituteGroup.findMany({ where: { isActive: true }, include: { options: { where: { isActive: true }, include: { recipeLines: { include: { ingredient: true } } }, orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } }),
        app.prisma.substitute.findMany({ where: { isActive: true }, include: { prices: { include: { size: true } }, recipeConsumption: { include: { size: true, ingredient: true } } }, orderBy: { sortOrder: "asc" } }),
        app.prisma.substitutePrice.findMany({ include: { size: true } }),
        app.prisma.substituteRecipeConsumption.findMany({ include: { size: true, ingredient: true } }),
        app.prisma.menuItemAddOnGroup.findMany(),
        app.prisma.menuItemSubstituteGroup.findMany(),
        app.prisma.menuItemSubstitute.findMany(),
        app.prisma.ingredient.findMany({ where: { version: versionFilter } }),
        app.prisma.recipeLine.findMany({ where: { version: versionFilter } }),
        app.prisma.recipeLineSize.findMany({ where: { version: versionFilter } }),
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
          include: { availability: { orderBy: { sortOrder: "asc" } } },
        }),
        app.prisma.menuItemSizePrice.findMany(),
        app.prisma.transactionTypeSetting.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
        app.prisma.shotPricingRule.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
        app.prisma.storeSetting.findUnique({ where: { id: "1" } }),
      ]);

      const latestVersion = catalogVersion?.latestVersion ?? 0;

      // Delta sync: include related entities for changed items (recipe lines, recipe line sizes, referenced ingredients)
      // because editing an item bumps only its version, not related rows' versions
      let recipeLines: typeof recipeLinesVersioned = recipeLinesVersioned;
      let recipeLineSizes: typeof recipeLineSizesVersioned = recipeLineSizesVersioned;
      let ingredients: typeof ingredientsVersioned = ingredientsVersioned;
      if (sinceVersion > 0 && items.length > 0) {
        const changedItemIds = items.map((i) => i.id);
        const [recipeLinesForItems, recipeLineSizesForItems] = await Promise.all([
          app.prisma.recipeLine.findMany({ where: { menuItemId: { in: changedItemIds } } }),
          app.prisma.recipeLineSize.findMany({ where: { menuItemId: { in: changedItemIds } } }),
        ]);
        const rlById = new Map(recipeLinesVersioned.map((r) => [r.id, r]));
        for (const r of recipeLinesForItems) {
          if (!rlById.has(r.id)) rlById.set(r.id, r);
        }
        recipeLines = Array.from(rlById.values());
        const rlsById = new Map(recipeLineSizesVersioned.map((r) => [r.id, r]));
        for (const r of recipeLineSizesForItems) {
          if (!rlsById.has(r.id)) rlsById.set(r.id, r);
        }
        recipeLineSizes = Array.from(rlsById.values());
        const refIngIds = new Set([
          ...recipeLines.map((r) => r.ingredientId),
          ...recipeLineSizes.map((r) => r.ingredientId),
        ]);
        const existingIngIds = new Set(ingredientsVersioned.map((i) => i.id));
        const missingIngIds = [...refIngIds].filter((id) => !existingIngIds.has(id));
        if (missingIngIds.length > 0) {
          const extraIngredients = await app.prisma.ingredient.findMany({
            where: { id: { in: missingIngIds } },
          });
          ingredients = [...ingredientsVersioned, ...extraIngredients];
        }
      }

      app.log.info({
        sinceVersion,
        latestVersion,
        changedItems: items.length,
        recipeLines: recipeLines.length,
        recipeLineSizes: recipeLineSizes.length,
        ingredients: ingredients.length,
        transactionTypes: transactionTypes.length,
        menuOptionGroups: menuOptionGroups.length,
        menuItemOptionGroups: menuItemOptionGroups.length,
      }, "[Sync] Catalog delta counts");

      return {
        latestVersion,
        items: items.map((i) => ({
          ...i,
          deletedAt: i.deletedAt?.toISOString() ?? null,
          defaultSizeId: i.defaultSizeId,
          defaultSizeOptionId: i.defaultSizeOptionId,
          defaultSubstituteId: (i as { defaultSubstituteId?: string | null }).defaultSubstituteId ?? null,
          defaultSubstituteOptionId: (i as { defaultSubstituteOptionId?: string | null }).defaultSubstituteOptionId ?? null,
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
        menuSizes: menuSizes.map((s) => {
          const avail = (s as { availability?: Array<{ id: string; mode: string; sizeId: string; imageUrl: string | null; isEnabled: boolean; sortOrder: number }> }).availability;
          return {
            id: s.id,
            label: s.label,
            sortOrder: s.sortOrder,
            groupId: s.groupId,
            availability: avail?.map((a) => ({ id: a.id, mode: a.mode, sizeId: a.sizeId, imageUrl: a.imageUrl ?? null, isEnabled: a.isEnabled, sortOrder: a.sortOrder })) ?? [],
          };
        }),
        menuItemSizePrices: menuItemSizePrices.map((p) => ({
          id: p.id,
          menuItemId: p.menuItemId,
          baseType: p.baseType,
          sizeOptionId: p.sizeOptionId,
          sizeCode: p.sizeCode,
          priceCents: p.priceCents,
        })),
        transactionTypes: transactionTypes.map((t) => ({
          id: t.id,
          code: t.code,
          label: t.label,
          priceDeltaCents: t.priceDeltaCents,
          isActive: t.isActive,
          sortOrder: t.sortOrder,
        })),
        shotPricingRules: shotPricingRules.map((s) => ({
          id: s.id,
          name: s.name,
          shotsPerBundle: s.shotsPerBundle,
          priceCentsPerBundle: s.priceCentsPerBundle,
          isActive: s.isActive,
          sortOrder: s.sortOrder,
        })),
        storeSettings: storeSetting ? { adminPinHash: storeSetting.adminPinHash ?? null } : undefined,
        addOnGroups: addOnGroups.map((g) => ({
          id: g.id,
          name: g.name,
          isActive: g.isActive,
          sortOrder: g.sortOrder,
          options: g.options.map((o) => ({
            id: o.id,
            groupId: o.groupId,
            name: o.name,
            priceCents: o.priceCents,
            isActive: o.isActive,
            sortOrder: o.sortOrder,
            recipeLines: o.recipeLines.map((r) => ({
              ingredientId: r.ingredientId,
              qtyPerItem: r.qtyPerItem.toString(),
              unitCode: r.unitCode,
            })),
          })),
        })),
        substituteGroups: substituteGroups.map((g) => ({
          id: g.id,
          name: g.name,
          isActive: g.isActive,
          sortOrder: g.sortOrder,
          options: g.options.map((o) => ({
            id: o.id,
            groupId: o.groupId,
            name: o.name,
            priceCents: o.priceCents,
            isActive: o.isActive,
            sortOrder: o.sortOrder,
            recipeLines: o.recipeLines.map((r) => ({
              ingredientId: r.ingredientId,
              qtyPerItem: r.qtyPerItem.toString(),
              unitCode: r.unitCode,
            })),
          })),
        })),
        substitutes: substitutes.map((s) => ({
          id: s.id,
          name: s.name,
          isActive: s.isActive,
          sortOrder: s.sortOrder,
        })),
        substitutePrices: substitutePrices.map((p) => ({
          id: p.id,
          substituteId: p.substituteId,
          sizeId: p.sizeId,
          mode: p.mode,
          priceCents: p.priceCents,
          size: p.size ? { id: p.size.id, label: p.size.label } : undefined,
        })),
        substituteRecipeConsumptions: substituteRecipeConsumptions.map((r) => ({
          id: r.id,
          substituteId: r.substituteId,
          sizeId: r.sizeId,
          mode: r.mode,
          ingredientId: r.ingredientId,
          qtyPerItem: r.qtyPerItem.toString(),
          unitCode: r.unitCode,
          size: r.size ? { id: r.size.id, label: r.size.label } : undefined,
        })),
        menuItemAddOnGroups: menuItemAddOnGroups.map((l) => ({ itemId: l.itemId, groupId: l.groupId })),
        menuItemSubstituteGroups: menuItemSubstituteGroups.map((l) => ({ itemId: l.itemId, groupId: l.groupId })),
        menuItemSubstitutes: menuItemSubstitutes.map((l) => ({ itemId: l.itemId, substituteId: l.substituteId })),
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

  // Verify admin PIN (for POS - requires STORE_SYNC_SECRET)
  app.post("/verify-admin-pin", async (req: FastifyRequest, reply: FastifyReply) => {
    if (syncSecret) {
      const key = (req.headers["x-store-sync-key"] as string) || "";
      if (key !== syncSecret) {
        reply.code(401);
        return { valid: false, error: "UNAUTHORIZED" };
      }
    }
    const parsed = z.object({ pin: z.string() }).safeParse(req.body);
    if (!parsed.success || !parsed.data.pin) {
      reply.code(400);
      return { valid: false, error: "INVALID_BODY" };
    }
    try {
      const row = await app.prisma.storeSetting.findUnique({ where: { id: "1" } });
      if (!row?.adminPinHash) {
        return { valid: false };
      }
      const valid = await verifyPassword(parsed.data.pin, row.adminPinHash);
      return { valid };
    } catch {
      return { valid: false };
    }
  });

  // --- Device commands (POS polling) - auth via X-Device-Key ---
  async function resolveDeviceFromKey(
    req: FastifyRequest,
    reply: FastifyReply
  ): Promise<{ id: string; storeId: string } | null> {
    const key = (req.headers["x-device-key"] as string) || "";
    if (!key.trim()) {
      reply.code(401);
      return null;
    }
    const device = await app.prisma.device.findUnique({ where: { deviceKey: key } });
    if (!device) {
      reply.code(401);
      return null;
    }
    return { id: device.id, storeId: device.storeId };
  }

  // GET /sync/commands/pending - returns PENDING commands for this device
  app.get("/commands/pending", async (req: FastifyRequest, reply: FastifyReply) => {
    const device = await resolveDeviceFromKey(req, reply);
    if (!device) return;

    const commands = await app.prisma.deviceCommand.findMany({
      where: { deviceId: device.id, status: "PENDING" },
      orderBy: { createdAt: "asc" },
    });
    return { commands: commands.map((c) => ({ id: c.id, type: c.type, createdAt: c.createdAt.toISOString() })) };
  });

  // POST /sync/commands/:id/status - update command status (RUNNING, SUCCESS, FAILED)
  app.post(
    "/commands/:id/status",
    async (
      req: FastifyRequest<{ Params: { id: string }; Body: { status: "RUNNING" | "SUCCESS" | "FAILED"; errorMessage?: string } }>,
      reply: FastifyReply
    ) => {
      const device = await resolveDeviceFromKey(req, reply);
      if (!device) return;

      const parsed = z
        .object({
          status: z.enum(["RUNNING", "SUCCESS", "FAILED"]),
          errorMessage: z.string().optional(),
        })
        .safeParse(req.body);
      if (!parsed.success) {
        reply.code(400);
        return { error: "INVALID_BODY", message: parsed.error.message };
      }

      const cmd = await app.prisma.deviceCommand.findFirst({
        where: { id: req.params.id, deviceId: device.id },
      });
      if (!cmd) {
        reply.code(404);
        return { error: "NOT_FOUND" };
      }

      const now = new Date();
      const updates = {
        status: parsed.data.status as "RUNNING" | "SUCCESS" | "FAILED",
        updatedAt: now,
        ...(parsed.data.errorMessage !== undefined && { errorMessage: parsed.data.errorMessage }),
        ...(parsed.data.status === "RUNNING" && !cmd.startedAt && { startedAt: now }),
        ...((parsed.data.status === "SUCCESS" || parsed.data.status === "FAILED") && { completedAt: now }),
      };
      await app.prisma.deviceCommand.update({ where: { id: cmd.id }, data: updates });
      return { ok: true };
    }
  );

  // POST /sync/device/heartbeat - report lastSeen, posVersion
  app.post(
    "/device/heartbeat",
    async (
      req: FastifyRequest<{ Body: { posVersion?: string } }>,
      reply: FastifyReply
    ) => {
      const device = await resolveDeviceFromKey(req, reply);
      if (!device) return;

      const parsed = z.object({ posVersion: z.string().optional() }).safeParse(req.body || {});
      const posVersion = parsed.success ? parsed.data.posVersion : undefined;

      await app.prisma.device.update({
        where: { id: device.id },
        data: { lastSeenAt: new Date(), posVersion: posVersion ?? undefined, updatedAt: new Date() },
      });
      return { ok: true };
    }
  );
}
