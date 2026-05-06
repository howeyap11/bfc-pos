import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { verifyPassword } from "../lib/password.js";
import {
  DEFAULT_WORK_DAY_FROM_TIME_LOCAL,
  DEFAULT_WORK_DAY_TO_TIME_LOCAL,
} from "../lib/workDayDefaults.js";
import { applyInventoryFromSyncedTransactionRow } from "../services/syncTransactionInventory.service.js";
import { upsertSyncedInventoryCountSession } from "../services/inventoryCountSync.service.js";
import { uploadImage } from "../services/r2.service.js";

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
  /** When every menu line includes consumptionPerUnitByIngredientJson, cloud skips recipe recompute (offline-first). */
  lineItems: z.array(z.object({
    name: z.string(),
    qty: z.number().int(),
    lineTotal: z.number().int(),
    sourceLineItemId: z.string().optional(),
    menuItemId: z.string().nullable().optional(),
    optionsJson: z.string().nullable().optional(),
    consumptionPerUnitByIngredientJson: z.string().nullable().optional(),
  })).optional(),
  createdAt: z.string(), // ISO date
  voidedAt: z.string().nullable().optional(),
  voidReason: z.string().nullable().optional(),
  isTest: z.boolean().optional().default(false),
  refundAmountCents: z.number().int().min(0).optional().default(0),
  refunds: z.array(z.object({
    id: z.string(),
    reason: z.string(),
    amountCents: z.number().int(),
    createdAt: z.string(),
    items: z.array(z.object({
      sourceLineItemId: z.string(),
      qtyRefunded: z.number().int(),
      amountRefundedCents: z.number().int(),
    })).optional(),
  })).optional().default([]),
});

const attendanceIngestSchema = z.object({
  storeId: z.string().min(1),
  sourceEventId: z.string().min(1),
  staffCloudId: z.string().nullable().optional(),
  staffName: z.string().min(1),
  staffRole: z.string().min(1),
  eventType: z.enum(["TIME_IN", "TIME_OUT"]),
  happenedAt: z.string(),
  selfieUploadedUrl: z.string().nullable().optional(),
});

const wasteIngestSchema = z.object({
  storeId: z.string().min(1),
  sourceReportId: z.string().min(1),
  staffCloudId: z.string().nullable().optional(),
  staffName: z.string().min(1),
  itemType: z.string().min(1),
  inventoryItemCloudId: z.string().nullable().optional(),
  inventoryItemName: z.string().min(1),
  quantity: z.string().min(1),
  unit: z.string().nullable().optional(),
  reason: z.string().min(1),
  notes: z.string().nullable().optional(),
  imageUploadedUrl: z.string().nullable().optional(),
  happenedAt: z.string(),
});

const inventoryCountIngestSchema = z.object({
  storeId: z.string().min(1),
  sourceSessionId: z.string().min(1),
  /** POS-frozen snapshot; when set, cloud stores as-is (no ledger recompute at ingest). */
  snapshotJson: z.string().optional(),
  submittedByStaffCloudId: z.string().nullable().optional(),
  submittedByLocalStaffId: z.string().nullable().optional(),
  submittedByStaffName: z.string().min(1),
  source: z.string().default("STAFF_UI"),
  notes: z.string().nullable().optional(),
  shiftType: z.string().nullable().optional(),
  businessDate: z.string().nullable().optional(),
  timeSubmitted: z.string().optional(),
  auditSource: z.string().optional(),
  countedAt: z.string(),
  lines: z.array(z.record(z.string(), z.any())).min(1),
});

const staffStockMovementIngestSchema = z.object({
  sourceLocalId: z.string().min(1),
  storeId: z.string().min(1),
  movementKind: z.enum(["STORE_ADD", "WAREHOUSE_ADD", "WAREHOUSE_PULLOUT"]),
  ingredientId: z.string().min(1),
  quantityBase: z.string().min(1),
  notes: z.string().nullable().optional(),
  submittedByStaffCloudId: z.string().nullable().optional(),
  submittedByStaffName: z.string().min(1),
  happenedAt: z.string(),
});

const sopSubmissionIngestSchema = z.object({
  storeId: z.string().min(1),
  sourceSubmissionId: z.string().min(1),
  templateCloudId: z.string().nullable().optional(),
  templateName: z.string().min(1),
  templateVersion: z.number().int().min(1),
  shiftType: z.string().min(1),
  submittedByStaffCloudId: z.string().nullable().optional(),
  submittedByStaffName: z.string().min(1),
  assignedShiftId: z.string().nullable().optional(),
  checklistResultJson: z.string(),
  notes: z.string().nullable().optional(),
  submittedAt: z.string(),
});

const staffOpsAttendanceSchema = z.object({
  sourceLocalId: z.string().min(1),
  storeId: z.string().min(1),
  staffCloudId: z.string().nullable().optional(),
  staffName: z.string().min(1),
  staffRole: z.string().min(1),
  eventType: z.enum(["TIME_IN", "TIME_OUT"]),
  happenedAt: z.string(),
  imageBase64: z.string().optional(),
});

const staffOpsWasteSchema = z.object({
  sourceLocalId: z.string().min(1),
  storeId: z.string().min(1),
  staffCloudId: z.string().nullable().optional(),
  staffName: z.string().min(1),
  itemType: z.string(),
  inventoryItemCloudId: z.string().nullable().optional(),
  inventoryItemName: z.string().min(1),
  quantity: z.string(),
  unit: z.string().nullable().optional(),
  reason: z.string(),
  notes: z.string().nullable().optional(),
  happenedAt: z.string(),
  imageBase64: z.string().optional(),
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
        staffList,
        optionChoiceRecipeLines,
        legacyAddOns,
        businessDetailsRow,
        receiptDetailsRow,
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
        app.prisma.staff.findMany({
          where: { storeId: "store_1" },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            email: true,
            passcode: true,
            passcodeHash: true,
            role: true,
            isActive: true,
            updatedAt: true,
          },
        }),
        app.prisma.optionChoiceRecipeLine.findMany({ include: { ingredient: true } }),
        app.prisma.addOn.findMany({
          where: { isActive: true },
          include: { recipeLines: { include: { ingredient: true } } },
          orderBy: { sortOrder: "asc" },
        }),
        app.prisma.businessDetails.findUnique({ where: { id: "1" } }),
        app.prisma.receiptDetails.findUnique({ where: { id: "1" } }),
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

      // Ensure ingredients referenced by substitute recipe-consumption matrix are always present.
      // Cloud `/menu-settings/substitutes` stores images on Ingredient, and the matrix references ingredientId.
      // In delta sync, ingredientsVersioned may not include these ids if no Ingredient row changed.
      {
        const refIngIds = new Set<string>([
          ...(substituteRecipeConsumptions ?? []).map((r) => r.ingredientId),
          ...(optionChoiceRecipeLines ?? []).map((r) => r.ingredientId),
          ...(addOns ?? []).flatMap((a) => (a.recipeLines ?? []).map((r) => r.ingredientId)),
          ...(substituteGroups ?? []).flatMap((g) => (g.options ?? []).flatMap((o) => (o.recipeLines ?? []).map((r) => r.ingredientId))),
        ]);
        const existingIngIds = new Set((ingredients ?? []).map((i) => i.id));
        const missing = [...refIngIds].filter((id) => id && !existingIngIds.has(id));
        if (missing.length > 0) {
          const extra = await app.prisma.ingredient.findMany({ where: { id: { in: missing } } });
          ingredients = [...ingredients, ...extra];
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
        staffCount: staffList.length,
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
          includedShots: (p as { includedShots?: number | null }).includedShots ?? null,
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
          extraShotIngredientId: s.extraShotIngredientId ?? null,
          qtyPerExtraShot:
            s.qtyPerExtraShot != null && s.qtyPerExtraShot !== undefined
              ? s.qtyPerExtraShot.toString()
              : null,
        })),
        // Always include business + receipt fields for POS receipt header sync. Admin PIN fields only when StoreSetting row exists (avoid omitting receipt data when storeSetting is null).
        storeSettings: {
          ...(storeSetting
            ? {
                adminPinHash: storeSetting.adminPinHash ?? null,
                ownerPasswordHash: storeSetting.ownerPasswordHash ?? null,
                workDayFromTimeLocal: storeSetting.workDayFromTimeLocal ?? DEFAULT_WORK_DAY_FROM_TIME_LOCAL,
                workDayToTimeLocal: storeSetting.workDayToTimeLocal ?? DEFAULT_WORK_DAY_TO_TIME_LOCAL,
              }
            : {}),
          businessName: businessDetailsRow?.businessName ?? null,
          address: businessDetailsRow?.address ?? null,
          receiptTaxType: receiptDetailsRow?.taxType ?? null,
          receiptNonVatTin: receiptDetailsRow?.nonVatTin ?? null,
          receiptVatTin: receiptDetailsRow?.vatTin ?? null,
          receiptBirMin: receiptDetailsRow?.birMin ?? null,
          receiptBirSerialNo: receiptDetailsRow?.birSerialNo ?? null,
        },
        optionChoiceRecipeLines: optionChoiceRecipeLines.map((r) => ({
          id: r.id,
          optionId: r.optionId,
          ingredientId: r.ingredientId,
          qtyPerItem: r.qtyPerItem.toString(),
          unitCode: r.unitCode,
        })),
        legacyAddOns: legacyAddOns.map((a) => ({
          id: a.id,
          recipeLines: a.recipeLines.map((r) => ({
            ingredientId: r.ingredientId,
            qtyPerItem: r.qtyPerItem.toString(),
            unitCode: r.unitCode,
          })),
        })),
        staff: staffList.map((s) => ({
          id: s.id,
          name: s.name,
          email: s.email ?? null,
          passcode: s.passcode,
          passcodeHash: s.passcodeHash ?? null,
          role: s.role,
          isActive: s.isActive,
          updatedAt: s.updatedAt.toISOString(),
        })),
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
    const refundAmountCents = d.refundAmountCents ?? 0;
    const refundsJson = d.refunds && d.refunds.length > 0 ? JSON.stringify(d.refunds) : null;
    const createdAt = new Date(d.createdAt);
    const voidedAt = d.voidedAt ? new Date(d.voidedAt) : null;
    try {
      const existing = await app.prisma.syncedTransaction.findUnique({
        where: { sourceTransactionId: d.sourceTransactionId },
      });
      if (existing) {
        const lineItemsPatch =
          d.lineItems && d.lineItems.length > 0
            ? { lineItemsSummaryJson: JSON.stringify(d.lineItems) }
            : {};
        await app.prisma.syncedTransaction.update({
          where: { id: existing.id },
          data: {
            status: d.status,
            voidedAt,
            voidReason: d.voidReason ?? null,
            refundAmountCents,
            refundsJson,
            ...lineItemsPatch,
          },
        });
        app.log.debug({ sourceTransactionId: d.sourceTransactionId }, "[Sync] Transaction updated (void/refund/sync)");
        const rowAfter = await app.prisma.syncedTransaction.findUnique({
          where: { id: existing.id },
        });
        if (rowAfter) {
          await applyInventoryFromSyncedTransactionRow({
            prisma: app.prisma,
            inventory: app.inventoryService,
            sourceTransactionId: rowAfter.sourceTransactionId,
            status: rowAfter.status,
            isTest: rowAfter.isTest,
            lineItemsSummaryJson: rowAfter.lineItemsSummaryJson,
            refundsJson: rowAfter.refundsJson,
            log: app.log,
          });
        }
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
          isTest: d.isTest ?? false,
          refundAmountCents,
          refundsJson,
        },
      });
      app.log.info({ id: created.id, transactionNo: d.transactionNo }, "[Sync] Transaction imported");
      const rowAfter = await app.prisma.syncedTransaction.findUnique({
        where: { id: created.id },
      });
      if (rowAfter) {
        await applyInventoryFromSyncedTransactionRow({
          prisma: app.prisma,
          inventory: app.inventoryService,
          sourceTransactionId: rowAfter.sourceTransactionId,
          status: rowAfter.status,
          isTest: rowAfter.isTest,
          lineItemsSummaryJson: rowAfter.lineItemsSummaryJson,
          refundsJson: rowAfter.refundsJson,
          log: app.log,
        });
      }
      return { ok: true, imported: true, id: created.id };
    } catch (err) {
      app.log.error({ err, sourceTransactionId: d.sourceTransactionId }, "[Sync] Failed to import transaction");
      reply.code(500);
      return { error: "IMPORT_FAILED", message: "Failed to import transaction" };
    }
  });

  app.post("/staff/attendance-events", async (req, reply) => {
    if (syncSecret) {
      const key = (req.headers["x-store-sync-key"] as string) || "";
      if (key !== syncSecret) return reply.code(401).send({ error: "UNAUTHORIZED" });
    }
    const parsed = attendanceIngestSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_BODY", details: parsed.error.flatten() });
    const d = parsed.data;
    const row = await app.prisma.syncedStaffAttendance.upsert({
      where: { storeId_sourceLocalId: { storeId: d.storeId, sourceLocalId: d.sourceEventId } },
      update: {
        staffCloudId: d.staffCloudId ?? null,
        staffName: d.staffName,
        staffRole: d.staffRole,
        eventType: d.eventType,
        happenedAt: new Date(d.happenedAt),
        selfieUrl: d.selfieUploadedUrl ?? null,
        selfieExpiresAt: d.selfieUploadedUrl ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
      },
      create: {
        sourceLocalId: d.sourceEventId,
        storeId: d.storeId,
        staffCloudId: d.staffCloudId ?? null,
        staffName: d.staffName,
        staffRole: d.staffRole,
        eventType: d.eventType,
        happenedAt: new Date(d.happenedAt),
        selfieUrl: d.selfieUploadedUrl ?? null,
        selfieExpiresAt: d.selfieUploadedUrl ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
      },
    });
    return { ok: true, id: row.id };
  });

  app.post("/staff/waste-reports", async (req, reply) => {
    if (syncSecret) {
      const key = (req.headers["x-store-sync-key"] as string) || "";
      if (key !== syncSecret) return reply.code(401).send({ error: "UNAUTHORIZED" });
    }
    const parsed = wasteIngestSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_BODY", details: parsed.error.flatten() });
    const d = parsed.data;
    const row = await app.prisma.syncedWasteReport.upsert({
      where: { storeId_sourceLocalId: { storeId: d.storeId, sourceLocalId: d.sourceReportId } },
      update: {
        staffCloudId: d.staffCloudId ?? null,
        staffName: d.staffName,
        itemType: d.itemType,
        inventoryItemCloudId: d.inventoryItemCloudId ?? null,
        inventoryItemName: d.inventoryItemName,
        quantity: d.quantity,
        unit: d.unit ?? null,
        reason: d.reason,
        notes: d.notes ?? null,
        imageUrl: d.imageUploadedUrl ?? null,
        happenedAt: new Date(d.happenedAt),
      },
      create: {
        sourceLocalId: d.sourceReportId,
        storeId: d.storeId,
        staffCloudId: d.staffCloudId ?? null,
        staffName: d.staffName,
        itemType: d.itemType,
        inventoryItemCloudId: d.inventoryItemCloudId ?? null,
        inventoryItemName: d.inventoryItemName,
        quantity: d.quantity,
        unit: d.unit ?? null,
        reason: d.reason,
        notes: d.notes ?? null,
        imageUrl: d.imageUploadedUrl ?? null,
        happenedAt: new Date(d.happenedAt),
      },
    });
    return { ok: true, id: row.id };
  });

  app.post("/staff/inventory-count-sessions", async (req, reply) => {
    if (syncSecret) {
      const key = (req.headers["x-store-sync-key"] as string) || "";
      if (key !== syncSecret) return reply.code(401).send({ error: "UNAUTHORIZED" });
    }
    const parsed = inventoryCountIngestSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_BODY", details: parsed.error.flatten() });
    const d = parsed.data;
    const { id } = await upsertSyncedInventoryCountSession(app, {
      ...d,
      lines: d.lines as Array<Record<string, unknown>>,
    });
    return { ok: true, id };
  });

  app.post("/staff/sop-submissions", async (req, reply) => {
    if (syncSecret) {
      const key = (req.headers["x-store-sync-key"] as string) || "";
      if (key !== syncSecret) return reply.code(401).send({ error: "UNAUTHORIZED" });
    }
    const parsed = sopSubmissionIngestSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_BODY", details: parsed.error.flatten() });
    const d = parsed.data;
    const row = await app.prisma.syncedSopChecklistSubmission.upsert({
      where: { storeId_sourceLocalId: { storeId: d.storeId, sourceLocalId: d.sourceSubmissionId } },
      update: {
        templateCloudId: d.templateCloudId ?? null,
        templateName: d.templateName,
        templateVersion: d.templateVersion,
        shiftType: d.shiftType,
        submittedByStaffCloudId: d.submittedByStaffCloudId ?? null,
        submittedByStaffName: d.submittedByStaffName,
        assignedShiftId: d.assignedShiftId ?? null,
        checklistResultJson: d.checklistResultJson,
        notes: d.notes ?? null,
        submittedAt: new Date(d.submittedAt),
      },
      create: {
        sourceLocalId: d.sourceSubmissionId,
        storeId: d.storeId,
        templateCloudId: d.templateCloudId ?? null,
        templateName: d.templateName,
        templateVersion: d.templateVersion,
        shiftType: d.shiftType,
        submittedByStaffCloudId: d.submittedByStaffCloudId ?? null,
        submittedByStaffName: d.submittedByStaffName,
        assignedShiftId: d.assignedShiftId ?? null,
        checklistResultJson: d.checklistResultJson,
        notes: d.notes ?? null,
        submittedAt: new Date(d.submittedAt),
      },
    });
    return { ok: true, id: row.id };
  });

  // Compatibility with local staffOpsSync.service topic paths
  app.post("/staff-ops/attendance", async (req, reply) => {
    if (syncSecret) {
      const key = (req.headers["x-store-sync-key"] as string) || "";
      if (key !== syncSecret) return reply.code(401).send({ error: "UNAUTHORIZED" });
    }
    const parsed = staffOpsAttendanceSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_BODY", details: parsed.error.flatten() });
    const d = parsed.data;
    let selfieUploadedUrl: string | null = null;
    if (d.imageBase64) {
      try {
        const imageBuffer = Buffer.from(d.imageBase64, "base64");
        selfieUploadedUrl = await uploadImage(imageBuffer, `${d.sourceLocalId}.jpg`, "image/jpeg");
      } catch {}
    }
    await app.prisma.syncedStaffAttendance.upsert({
      where: { storeId_sourceLocalId: { storeId: d.storeId, sourceLocalId: d.sourceLocalId } },
      update: {
        staffCloudId: d.staffCloudId ?? null,
        staffName: d.staffName,
        staffRole: d.staffRole,
        eventType: d.eventType,
        happenedAt: new Date(d.happenedAt),
        selfieUrl: selfieUploadedUrl,
        selfieExpiresAt: selfieUploadedUrl ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
      },
      create: {
        sourceLocalId: d.sourceLocalId,
        storeId: d.storeId,
        staffCloudId: d.staffCloudId ?? null,
        staffName: d.staffName,
        staffRole: d.staffRole,
        eventType: d.eventType,
        happenedAt: new Date(d.happenedAt),
        selfieUrl: selfieUploadedUrl,
        selfieExpiresAt: selfieUploadedUrl ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
      },
    });
    return { ok: true };
  });

  app.post("/staff-ops/waste-reports", async (req, reply) => {
    if (syncSecret) {
      const key = (req.headers["x-store-sync-key"] as string) || "";
      if (key !== syncSecret) return reply.code(401).send({ error: "UNAUTHORIZED" });
    }
    const parsed = staffOpsWasteSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_BODY", details: parsed.error.flatten() });
    const d = parsed.data;
    let imageUploadedUrl: string | null = null;
    if (d.imageBase64) {
      try {
        imageUploadedUrl = await uploadImage(Buffer.from(d.imageBase64, "base64"), `${d.sourceLocalId}.jpg`, "image/jpeg");
      } catch {}
    }
    await app.prisma.syncedWasteReport.upsert({
      where: { storeId_sourceLocalId: { storeId: d.storeId, sourceLocalId: d.sourceLocalId } },
      update: {
        staffCloudId: d.staffCloudId ?? null,
        staffName: d.staffName,
        itemType: d.itemType,
        inventoryItemCloudId: d.inventoryItemCloudId ?? null,
        inventoryItemName: d.inventoryItemName,
        quantity: d.quantity,
        unit: d.unit ?? null,
        reason: d.reason,
        notes: d.notes ?? null,
        imageUrl: imageUploadedUrl,
        happenedAt: new Date(d.happenedAt),
      },
      create: {
        sourceLocalId: d.sourceLocalId,
        storeId: d.storeId,
        staffCloudId: d.staffCloudId ?? null,
        staffName: d.staffName,
        itemType: d.itemType,
        inventoryItemCloudId: d.inventoryItemCloudId ?? null,
        inventoryItemName: d.inventoryItemName,
        quantity: d.quantity,
        unit: d.unit ?? null,
        reason: d.reason,
        notes: d.notes ?? null,
        imageUrl: imageUploadedUrl,
        happenedAt: new Date(d.happenedAt),
      },
    });
    return { ok: true };
  });

  app.post("/staff-ops/inventory-count-sessions", async (req, reply) => {
    if (syncSecret) {
      const key = (req.headers["x-store-sync-key"] as string) || "";
      if (key !== syncSecret) return reply.code(401).send({ error: "UNAUTHORIZED" });
    }
    const parsed = inventoryCountIngestSchema.safeParse({
      ...(req.body as any),
      sourceSessionId: (req.body as any)?.sourceLocalId,
    });
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_BODY", details: parsed.error.flatten() });
    const d = parsed.data;
    await upsertSyncedInventoryCountSession(app, {
      ...d,
      lines: d.lines as Array<Record<string, unknown>>,
    });
    return { ok: true };
  });

  app.post("/staff-ops/stock-movements", async (req, reply) => {
    if (syncSecret) {
      const key = (req.headers["x-store-sync-key"] as string) || "";
      if (key !== syncSecret) return reply.code(401).send({ error: "UNAUTHORIZED" });
    }
    const parsed = staffStockMovementIngestSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_BODY", details: parsed.error.flatten() });
    const d = parsed.data;
    const qty = Number(d.quantityBase);
    if (!Number.isFinite(qty) || qty <= 0) {
      return reply.code(400).send({ error: "INVALID_QUANTITY" });
    }

    const ing = await app.prisma.ingredient.findFirst({
      where: { id: d.ingredientId, deletedAt: null, isActive: true },
    });
    if (!ing) {
      return reply.code(400).send({ error: "UNKNOWN_INGREDIENT" });
    }

    const locations = await app.prisma.inventoryLocation.findMany({
      where: { isActive: true },
      select: { id: true, code: true },
    });
    const mainCafe = locations.find((l) => l.code === "MAIN_CAFE");
    const warehouse = locations.find((l) => l.code === "WAREHOUSE");
    if (!mainCafe) {
      return reply.code(503).send({ error: "NO_STORE_LOCATION" });
    }
    if (d.movementKind !== "STORE_ADD" && !warehouse) {
      return reply.code(503).send({ error: "NO_WAREHOUSE_LOCATION" });
    }

    try {
      if (d.movementKind === "WAREHOUSE_PULLOUT") {
        const dupTransfer = await app.prisma.stockMovement.findFirst({
          where: { sourceType: "TRANSFER", sourceId: d.sourceLocalId },
        });
        if (dupTransfer) return { ok: true, skipped: true };
        await app.inventoryService.postTransfer({
          lines: [{ ingredientId: ing.id, quantityBase: qty }],
          fromLocationId: warehouse!.id,
          toLocationId: mainCafe.id,
          sourceId: d.sourceLocalId,
        });
      } else {
        const sourceType = `STAFF_POS_${d.movementKind}`;
        const existing = await app.prisma.stockMovement.findFirst({
          where: { sourceType, sourceId: d.sourceLocalId },
        });
        if (existing) return { ok: true, skipped: true };
        if (d.movementKind === "STORE_ADD") {
          await app.inventoryService.postMovement({
            ingredientId: ing.id,
            locationId: mainCafe.id,
            movementType: "MANUAL_ADJUSTMENT",
            quantityDeltaBaseUnit: qty,
            sourceType,
            sourceId: d.sourceLocalId,
            actorStaffId: d.submittedByStaffCloudId?.trim() || null,
            notes: d.notes ?? `Staff store add (${d.submittedByStaffName})`,
          });
        } else {
          await app.inventoryService.postMovement({
            ingredientId: ing.id,
            locationId: warehouse!.id,
            movementType: "MANUAL_ADJUSTMENT",
            quantityDeltaBaseUnit: qty,
            sourceType,
            sourceId: d.sourceLocalId,
            actorStaffId: d.submittedByStaffCloudId?.trim() || null,
            notes: d.notes ?? `Staff warehouse add (${d.submittedByStaffName})`,
          });
        }
      }
    } catch (err) {
      app.log.error({ err, sourceLocalId: d.sourceLocalId }, "[Sync] staff stock movement failed");
      reply.code(500);
      return { error: "STOCK_MOVEMENT_FAILED" };
    }
    return { ok: true };
  });

  app.post("/staff-ops/sop-submissions", async (req, reply) => {
    if (syncSecret) {
      const key = (req.headers["x-store-sync-key"] as string) || "";
      if (key !== syncSecret) return reply.code(401).send({ error: "UNAUTHORIZED" });
    }
    const body = req.body as any;
    const parsed = sopSubmissionIngestSchema.safeParse({
      ...body,
      sourceSubmissionId: body.sourceLocalId,
    });
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_BODY", details: parsed.error.flatten() });
    const d = parsed.data;
    await app.prisma.syncedSopChecklistSubmission.upsert({
      where: { storeId_sourceLocalId: { storeId: d.storeId, sourceLocalId: d.sourceSubmissionId } },
      update: { templateCloudId: d.templateCloudId ?? null, templateName: d.templateName, templateVersion: d.templateVersion, shiftType: d.shiftType, submittedByStaffCloudId: d.submittedByStaffCloudId ?? null, submittedByStaffName: d.submittedByStaffName, assignedShiftId: d.assignedShiftId ?? null, checklistResultJson: d.checklistResultJson, notes: d.notes ?? null, submittedAt: new Date(d.submittedAt) },
      create: { sourceLocalId: d.sourceSubmissionId, storeId: d.storeId, templateCloudId: d.templateCloudId ?? null, templateName: d.templateName, templateVersion: d.templateVersion, shiftType: d.shiftType, submittedByStaffCloudId: d.submittedByStaffCloudId ?? null, submittedByStaffName: d.submittedByStaffName, assignedShiftId: d.assignedShiftId ?? null, checklistResultJson: d.checklistResultJson, notes: d.notes ?? null, submittedAt: new Date(d.submittedAt) },
    });
    return { ok: true };
  });

  app.get("/staff/shifts", async (req, reply) => {
    if (syncSecret) {
      const key = (req.headers["x-store-sync-key"] as string) || "";
      if (key !== syncSecret) return reply.code(401).send({ error: "UNAUTHORIZED" });
    }
    const storeId = String((req.query as any)?.storeId ?? "store_1");
    const rows = await app.prisma.cloudStaffShiftAssignment.findMany({ where: { storeId }, orderBy: { shiftDate: "asc" }, take: 300 });
    return { items: rows };
  });

  app.get("/staff/incentives", async (req, reply) => {
    if (syncSecret) {
      const key = (req.headers["x-store-sync-key"] as string) || "";
      if (key !== syncSecret) return reply.code(401).send({ error: "UNAUTHORIZED" });
    }
    const storeId = String((req.query as any)?.storeId ?? "store_1");
    const rows = await app.prisma.cloudStaffIncentiveLedger.findMany({ where: { storeId }, orderBy: { happenedAt: "desc" }, take: 500 });
    return { items: rows };
  });

  app.post("/staff/attendance-selfies/cleanup", async (req, reply) => {
    if (syncSecret) {
      const key = (req.headers["x-store-sync-key"] as string) || "";
      if (key !== syncSecret) return reply.code(401).send({ error: "UNAUTHORIZED" });
    }
    const now = new Date();
    const result = await app.prisma.syncedStaffAttendance.updateMany({
      where: {
        selfieUrl: { not: null },
        selfiePurgedAt: null,
        selfieExpiresAt: { lte: now },
      },
      data: {
        selfieUrl: null,
        selfiePurgedAt: now,
      },
    });
    return { ok: true, cleaned: result.count };
  });

  // Owner password hash (for POS – requires X-Store-Sync-Key). POS caches for offline verification.
  app.get("/owner-password-hash", async (req: FastifyRequest, reply: FastifyReply) => {
    if (syncSecret) {
      const key = (req.headers["x-store-sync-key"] as string) || "";
      if (key !== syncSecret) {
        reply.code(401);
        return { error: "UNAUTHORIZED", message: "Invalid or missing X-Store-Sync-Key" };
      }
    }
    const row = await app.prisma.storeSetting.findUnique({ where: { id: "1" } });
    return { ownerPasswordHash: row?.ownerPasswordHash ?? null };
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

  // Delete test transactions (POS Settings) – requires X-Store-Sync-Key + admin PIN. Only deletes isTest = true.
  app.post("/delete-test-transactions", async (req: FastifyRequest, reply: FastifyReply) => {
    if (syncSecret) {
      const key = (req.headers["x-store-sync-key"] as string) || "";
      if (key !== syncSecret) {
        reply.code(401);
        return { error: "UNAUTHORIZED", message: "Invalid or missing X-Store-Sync-Key" };
      }
    }
    const parsed = z.object({ pin: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "INVALID_BODY", message: "pin required" };
    }
    try {
      const row = await app.prisma.storeSetting.findUnique({ where: { id: "1" } });
      if (!row?.adminPinHash) {
        reply.code(400);
        return { error: "NO_PIN", message: "Admin PIN not configured" };
      }
      const valid = await verifyPassword(parsed.data.pin, row.adminPinHash);
      if (!valid) {
        reply.code(401);
        return { error: "INVALID_PIN", message: "Invalid admin PIN" };
      }
      const result = await app.prisma.syncedTransaction.deleteMany({
        where: { isTest: true },
      });
      const deletedCount = result.count;
      await app.prisma.devActionLog.create({
        data: {
          adminId: "sync-api",
          adminEmail: "sync@pos",
          actionType: "DELETE_TEST_TRANSACTIONS",
          scope: "SyncedTransaction where isTest = true (from POS)",
          affectedCount: deletedCount,
          result: "SUCCESS",
          isProduction: process.env.NODE_ENV === "production",
        },
      });
      return { deletedCount };
    } catch (err) {
      app.log.error({ err }, "[Sync] Delete test transactions failed");
      reply.code(500);
      return { error: "DELETE_FAILED", message: "Failed to delete test transactions" };
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
