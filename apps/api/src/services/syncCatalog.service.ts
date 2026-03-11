import type { PrismaClient } from "@prisma/client";

const CLOUD_URL = process.env.CLOUD_URL ?? "";
const ADMIN_ROLES = ["ADMIN", "OIC", "AUDITOR", "MANAGER"];

type CloudItem = {
  id: string;
  name: string;
  priceCents: number;
  isActive: boolean;
  imageUrl?: string | null;
  deletedAt: string | null;
  version: number;
  categoryId?: string | null;
  subCategoryId?: string | null;
  isDrink?: boolean;
  serveVessel?: string | null;
  defaultSizeId?: string | null;
  defaultSizeOptionId?: string | null;
  supportsShots?: boolean;
  defaultShots?: number | null;
  drinkSizeConfigs?: Array<{ mode: string; optionId: string; isEnabled?: boolean }>;
  drinkModeDefaults?: Array<{ mode: string; defaultOptionId: string }>;
};

type CloudMenuItemSize = {
  id: string;
  menuItemId: string;
  label: string;
  temp: string;
  sortOrder: number;
  isActive: boolean;
};

type CloudMenuItemSizePrice = {
  id: string;
  menuItemId: string;
  baseType: string;
  sizeOptionId: string;
  sizeCode: string;
  priceCents: number;
};

type CloudCategory = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
};

type CloudSubCategory = {
  id: string;
  name: string;
  categoryId: string;
  sortOrder: number;
};

type CloudMenuOptionGroup = {
  id: string;
  name: string;
  required: boolean;
  multi: boolean;
  isSizeGroup?: boolean;
  defaultOptionId?: string | null;
};

type CloudMenuOptionGroupSection = {
  id: string;
  optionGroupId: string;
  key: string;
  label: string;
  sortOrder: number;
};

type CloudMenuSize = {
  id: string;
  groupId: string;
  label: string;
  sortOrder: number;
  availability?: Array<{ id: string; mode: string; sizeId: string; imageUrl: string | null; isEnabled: boolean; sortOrder: number }>;
};

type CloudTransactionType = {
  id: string;
  code: string;
  label: string;
  priceDeltaCents: number;
  isActive: boolean;
  sortOrder: number;
};

type CloudShotPricingRule = {
  id: string;
  name: string;
  shotsPerBundle: number;
  priceCentsPerBundle: number;
  isActive: boolean;
  sortOrder: number;
};

type CloudMenuOption = {
  id: string;
  name: string;
  priceDelta: number;
  groupId: string;
};

type CloudMenuItemOptionGroup = {
  itemId: string;
  groupId: string;
};

type CloudIngredient = {
  id: string;
  name: string;
  unitCode: string;
  isActive: boolean;
  deletedAt: string | null;
  version: number;
  imageUrl?: string | null;
};

type CloudRecipeLine = {
  id: string;
  menuItemId: string;
  ingredientId: string;
  qtyPerItem: string;
  unitCode: string;
  deletedAt: string | null;
  version: number;
};

type CloudRecipeLineSize = {
  id: string;
  menuItemId: string;
  ingredientId: string;
  baseType: string;
  sizeCode: string;
  qtyPerItem: string;
  unitCode: string;
  deletedAt: string | null;
  version: number;
};

type SyncResponse = {
  latestVersion: number;
  items: CloudItem[];
  ingredients: CloudIngredient[];
  recipeLines: CloudRecipeLine[];
  recipeLineSizes?: CloudRecipeLineSize[];
  categories?: CloudCategory[];
  subCategories?: CloudSubCategory[];
  menuOptionGroups?: CloudMenuOptionGroup[];
  menuOptions?: CloudMenuOption[];
  menuOptionGroupSections?: CloudMenuOptionGroupSection[];
  menuItemOptionGroups?: CloudMenuItemOptionGroup[];
  menuItemSizes?: CloudMenuItemSize[];
  menuSizes?: CloudMenuSize[];
  menuItemSizePrices?: CloudMenuItemSizePrice[];
  transactionTypes?: CloudTransactionType[];
  shotPricingRules?: CloudShotPricingRule[];
  addOnGroups?: Array<{
    id: string;
    name: string;
    isActive: boolean;
    sortOrder: number;
    options: Array<{
      id: string;
      groupId: string;
      name: string;
      priceCents: number;
      isActive: boolean;
      sortOrder: number;
      recipeLines?: Array<{ ingredientId: string; qtyPerItem: string; unitCode: string }>;
    }>;
  }>;
  substituteGroups?: Array<{
    id: string;
    name: string;
    isActive: boolean;
    sortOrder: number;
    options: Array<{
      id: string;
      groupId: string;
      name: string;
      priceCents: number;
      isActive: boolean;
      sortOrder: number;
      recipeLines?: Array<{ ingredientId: string; qtyPerItem: string; unitCode: string }>;
    }>;
  }>;
  substitutes?: Array<{
    id: string;
    name: string;
    priceCents: number;
    isActive: boolean;
    sortOrder: number;
    recipeLines?: Array<{ ingredientId: string; qtyPerItem: string; unitCode: string }>;
  }>;
  substitutePrices?: Array<{
    id: string;
    substituteId: string;
    sizeId: string;
    mode: string;
    priceCents: number;
  }>;
  substituteRecipeConsumptions?: Array<{
    id: string;
    substituteId: string;
    sizeId: string;
    mode: string;
    ingredientId: string;
    qtyPerItem: string;
    unitCode: string;
  }>;
  menuItemAddOnGroups?: { itemId: string; groupId: string }[];
  menuItemSubstituteGroups?: { itemId: string; groupId: string }[];
  menuItemSubstitutes?: { itemId: string; substituteId: string }[];
  storeSettings?: { adminPinHash: string | null };
};

export type SyncCatalogResult = {
  latestVersion: number;
  itemsUpserted: number;
  ingredientsUpserted: number;
  recipeLinesUpserted: number;
  recipeLineSizesUpserted: number;
  transactionTypesUpserted: number;
  shotPricingRulesUpserted: number;
};

/**
 * Sync catalog from cloud API. Idempotent.
 * Returns 503 if cloud unreachable. Does not throw.
 */
export async function syncCatalogFromCloud(
  prisma: PrismaClient,
  branchId = "default"
): Promise<{ ok: true; result: SyncCatalogResult } | { ok: false; error: string; code: number }> {
  if (!CLOUD_URL?.trim()) {
    return { ok: false, error: "CLOUD_URL not configured", code: 503 };
  }

  let data: SyncResponse;

  // 1) Local: read sync state (fails if Prisma models undefined)
  let sinceVersion: number;
  try {
    if (!prisma.syncState) {
      return {
        ok: false,
        error: "Local sync persistence error: Prisma client missing SyncState model. Run: cd apps/api && pnpm exec prisma generate",
        code: 500,
      };
    }
    const syncState = await prisma.syncState.upsert({
      where: { branchId },
      create: { branchId, catalogVersion: 0 },
      update: {},
    });
    sinceVersion = syncState.catalogVersion;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `Local sync persistence error: ${msg}`,
      code: 500,
    };
  }

  // 2) Network: fetch from cloud (cloud unreachable vs local Prisma)
  try {
    const url = `${CLOUD_URL.replace(/\/$/, "")}/sync/catalog?sinceVersion=${sinceVersion}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      return {
        ok: false,
        error: `Cloud API returned ${res.status}`,
        code: 503,
      };
    }

    data = (await res.json()) as SyncResponse;

    // Diagnostic: log sync payload counts (helps debug itemsUpserted: 0)
    console.log("[SyncCatalog] Cloud response:", {
      sinceVersion,
      itemsReceived: data.items.length,
      ingredientsReceived: data.ingredients.length,
      recipeLinesReceived: data.recipeLines.length,
      recipeLineSizesReceived: (data.recipeLineSizes ?? []).length,
      transactionTypesReceived: (data.transactionTypes ?? []).length,
      shotPricingRulesReceived: (data.shotPricingRules ?? []).length,
      addOnGroupsReceived: (data.addOnGroups ?? []).length,
      substituteGroupsReceived: (data.substituteGroups ?? []).length,
      substitutesReceived: (data.substitutes ?? []).length,
      substitutePricesReceived: (data.substitutePrices ?? []).length,
      substituteRecipeConsumptionsReceived: (data.substituteRecipeConsumptions ?? []).length,
      menuItemSubstitutesReceived: (data.menuItemSubstitutes ?? []).length,
      menuItemAddOnGroupsReceived: (data.menuItemAddOnGroups ?? []).length,
      menuItemSubstituteGroupsReceived: (data.menuItemSubstituteGroups ?? []).length,
      latestVersion: data.latestVersion,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `Cloud unreachable: ${msg}`,
      code: 503,
    };
  }

  const storeId = branchId === "default" ? "store_1" : branchId;
  let itemsUpserted = 0;
  let ingredientsUpserted = 0;
  let recipeLinesUpserted = 0;
  let recipeLineSizesUpserted = 0;
  let transactionTypesUpserted = 0;
  let shotPricingRulesUpserted = 0;

  try {
    await prisma.$transaction(async (tx) => {
      for (const i of data.items) {
        await tx.cloudMenuItem.upsert({
          where: { cloudId: i.id },
          create: {
            cloudId: i.id,
            storeId,
            name: i.name,
            priceCents: i.priceCents,
            isActive: i.isActive,
            imageUrl: i.imageUrl ?? null,
            categoryCloudId: i.categoryId ?? null,
            subCategoryCloudId: i.subCategoryId ?? null,
            version: i.version,
            deletedAt: i.deletedAt ? new Date(i.deletedAt) : null,
            isDrink: i.isDrink ?? false,
            serveVessel: i.serveVessel ?? null,
            defaultSizeId: i.defaultSizeId ?? null,
            defaultSizeOptionCloudId: i.defaultSizeOptionId ?? null,
            hasSizes: (i as any).hasSizes ?? false,
            supportsShots: i.supportsShots ?? false,
            defaultShots: i.defaultShots ?? null,
            defaultSubstituteCloudId: (i as { defaultSubstituteId?: string | null }).defaultSubstituteId ?? (i as { defaultSubstituteOptionId?: string | null }).defaultSubstituteOptionId ?? null,
          },
          update: {
            name: i.name,
            priceCents: i.priceCents,
            isActive: i.isActive,
            imageUrl: i.imageUrl ?? null,
            categoryCloudId: i.categoryId ?? null,
            subCategoryCloudId: i.subCategoryId ?? null,
            version: i.version,
            deletedAt: i.deletedAt ? new Date(i.deletedAt) : null,
            isDrink: i.isDrink ?? false,
            serveVessel: i.serveVessel ?? null,
            defaultSizeId: i.defaultSizeId ?? null,
            defaultSizeOptionCloudId: i.defaultSizeOptionId ?? null,
            hasSizes: (i as any).hasSizes ?? false,
            supportsShots: i.supportsShots ?? false,
            defaultShots: i.defaultShots ?? null,
            defaultSubstituteCloudId: (i as { defaultSubstituteId?: string | null }).defaultSubstituteId ?? (i as { defaultSubstituteOptionId?: string | null }).defaultSubstituteOptionId ?? null,
          },
        });
        itemsUpserted++;
      }

      // Sync per-item drink size configs (mode + optionId). Replace all configs for each item.
      await tx.cloudMenuItemDrinkSizeConfig.deleteMany({ where: { storeId } });
      for (const i of data.items) {
        const configs = i.drinkSizeConfigs ?? [];
        const enabled = configs.filter((c) => c.isEnabled !== false);
        if (enabled.length > 0) {
          await tx.cloudMenuItemDrinkSizeConfig.createMany({
            data: enabled.map((c) => ({
              storeId,
              menuItemCloudId: i.id,
              mode: (c.mode || "").toUpperCase(),
              optionCloudId: c.optionId,
            })),
          });
        }
      }

      const validCategories = (data.categories ?? []).filter((c: { deletedAt?: string | null }) => !c.deletedAt);
      const validCategoryIds = validCategories.map((c) => c.id);
      await tx.cloudCategory.deleteMany({
        where: { storeId, cloudId: { notIn: validCategoryIds } },
      });
      for (const c of validCategories) {
        await tx.cloudCategory.upsert({
          where: { cloudId: c.id },
          create: {
            cloudId: c.id,
            storeId,
            name: c.name,
            slug: c.slug,
            sortOrder: c.sortOrder,
          },
          update: { name: c.name, slug: c.slug, sortOrder: c.sortOrder },
        });
      }

      const validSubCategories = (data.subCategories ?? []).filter((s: { deletedAt?: string | null }) => !s.deletedAt);
      const validSubCategoryIds = validSubCategories.map((s) => s.id);
      await tx.cloudSubCategory.deleteMany({
        where: { storeId, cloudId: { notIn: validSubCategoryIds } },
      });
      for (const sc of validSubCategories) {
        if (!validCategoryIds.includes(sc.categoryId)) continue;
        await tx.cloudSubCategory.upsert({
          where: { cloudId: sc.id },
          create: {
            cloudId: sc.id,
            storeId,
            name: sc.name,
            categoryCloudId: sc.categoryId,
            sortOrder: sc.sortOrder,
          },
          update: {
            name: sc.name,
            categoryCloudId: sc.categoryId,
            sortOrder: sc.sortOrder,
          },
        });
      }

      for (const g of data.menuOptionGroups ?? []) {
        await tx.cloudMenuOptionGroup.upsert({
          where: { cloudId: g.id },
          create: {
            cloudId: g.id,
            storeId,
            name: g.name,
            required: g.required,
            multi: g.multi,
            isSizeGroup: g.isSizeGroup ?? false,
            defaultOptionCloudId: g.defaultOptionId ?? null,
          },
          update: {
            name: g.name,
            required: g.required,
            multi: g.multi,
            isSizeGroup: g.isSizeGroup ?? false,
            defaultOptionCloudId: g.defaultOptionId ?? null,
          },
        });
      }

      // Sync option group sections (modifier sections)
      const validSectionCloudIds = (data.menuOptionGroupSections ?? []).map((s) => s.id);
      if (validSectionCloudIds.length > 0) {
        await tx.cloudMenuOptionGroupSection.deleteMany({
          where: { storeId, cloudId: { notIn: validSectionCloudIds } },
        });
      } else {
        await tx.cloudMenuOptionGroupSection.deleteMany({ where: { storeId } });
      }
      for (const sec of data.menuOptionGroupSections ?? []) {
        await tx.cloudMenuOptionGroupSection.upsert({
          where: { cloudId: sec.id },
          create: {
            cloudId: sec.id,
            storeId,
            optionGroupCloudId: sec.optionGroupId,
            key: sec.key,
            label: sec.label,
            sortOrder: sec.sortOrder ?? 0,
          },
          update: {
            optionGroupCloudId: sec.optionGroupId,
            key: sec.key,
            label: sec.label,
            sortOrder: sec.sortOrder ?? 0,
          },
        });
      }

      // Sync menu sizes (global size definitions) + availability (per-mode imageUrl, isEnabled)
      const validMenuSizeCloudIds = new Set((data.menuSizes ?? []).map((s) => s.id));
      await tx.cloudMenuSize.deleteMany({
        where: { storeId, cloudId: { notIn: [...validMenuSizeCloudIds] } },
      });
      for (const ms of data.menuSizes ?? []) {
        const groupCloudId = (ms as { groupId?: string }).groupId ?? null;
        if (!groupCloudId) continue; // Skip sizes without groupId (cloud data integrity guard)
        await tx.cloudMenuSize.upsert({
          where: { cloudId: ms.id },
          create: {
            cloudId: ms.id,
            storeId,
            groupCloudId,
            label: ms.label,
            sortOrder: ms.sortOrder ?? 0,
          },
          update: {
            groupCloudId,
            label: ms.label,
            sortOrder: ms.sortOrder ?? 0,
          },
        });
        await tx.cloudMenuSizeAvailability.deleteMany({
          where: { storeId, sizeCloudId: ms.id },
        });
        const availList = ms.availability ?? [];
        if (availList.length > 0) {
          await tx.cloudMenuSizeAvailability.createMany({
            data: availList.map((a) => ({
              cloudId: a.id,
              storeId,
              sizeCloudId: ms.id,
              mode: a.mode,
              imageUrl: a.imageUrl ?? null,
              isEnabled: a.isEnabled !== false,
              sortOrder: a.sortOrder ?? 0,
            })),
          });
        }
      }

      // Sync transaction types
      const validTxTypeCloudIds = new Set((data.transactionTypes ?? []).map((t) => t.id));
      await tx.cloudTransactionType.deleteMany({
        where: { storeId, cloudId: { notIn: [...validTxTypeCloudIds] } },
      });
      for (const tt of data.transactionTypes ?? []) {
        await tx.cloudTransactionType.upsert({
          where: { cloudId: tt.id },
          create: {
            cloudId: tt.id,
            storeId,
            code: tt.code,
            label: tt.label,
            priceDeltaCents: tt.priceDeltaCents ?? 0,
            isActive: tt.isActive !== false,
            sortOrder: tt.sortOrder ?? 0,
          },
          update: {
            code: tt.code,
            label: tt.label,
            priceDeltaCents: tt.priceDeltaCents ?? 0,
            isActive: tt.isActive !== false,
            sortOrder: tt.sortOrder ?? 0,
          },
        });
        transactionTypesUpserted++;
      }

      // Sync shot pricing rules
      const validShotRuleCloudIds = new Set((data.shotPricingRules ?? []).map((s) => s.id));
      await tx.cloudShotPricingRule.deleteMany({
        where: { storeId, cloudId: { notIn: [...validShotRuleCloudIds] } },
      });
      for (const sr of data.shotPricingRules ?? []) {
        await tx.cloudShotPricingRule.upsert({
          where: { cloudId: sr.id },
          create: {
            cloudId: sr.id,
            storeId,
            name: sr.name ?? "Standard",
            shotsPerBundle: sr.shotsPerBundle ?? 2,
            priceCentsPerBundle: sr.priceCentsPerBundle ?? 4000,
            isActive: sr.isActive !== false,
            sortOrder: sr.sortOrder ?? 0,
          },
          update: {
            name: sr.name ?? "Standard",
            shotsPerBundle: sr.shotsPerBundle ?? 2,
            priceCentsPerBundle: sr.priceCentsPerBundle ?? 4000,
            isActive: sr.isActive !== false,
            sortOrder: sr.sortOrder ?? 0,
          },
        });
        shotPricingRulesUpserted++;
      }

      // Sync add-ons from groups (flatten options to CloudAddOn for POS consumption)
      const addOnGroups = data.addOnGroups ?? [];
      for (const g of addOnGroups) {
        for (const o of g.options ?? []) {
          await tx.cloudAddOn.upsert({
            where: { cloudId: o.id },
            create: {
              cloudId: o.id,
              storeId,
              name: o.name,
              priceCents: o.priceCents ?? 0,
              sortOrder: o.sortOrder ?? 0,
            },
            update: {
              name: o.name,
              priceCents: o.priceCents ?? 0,
              sortOrder: o.sortOrder ?? 0,
            },
          });
        }
      }
      const addOnOptionsByGroup = new Map<string, Array<{ id: string }>>();
      for (const g of addOnGroups) {
        addOnOptionsByGroup.set(g.id, g.options?.map((o) => ({ id: o.id })) ?? []);
      }
      await tx.cloudMenuItemAddOn.deleteMany({ where: { storeId } });
      const addOnGroupLinks = data.menuItemAddOnGroups ?? [];
      const addOnRows: Array<{ storeId: string; menuItemCloudId: string; addOnCloudId: string }> = [];
      for (const l of addOnGroupLinks) {
        const opts = addOnOptionsByGroup.get(l.groupId) ?? [];
        for (const o of opts) {
          addOnRows.push({ storeId, menuItemCloudId: l.itemId, addOnCloudId: o.id });
        }
      }
      const dedupedAddOnRows = Array.from(
        new Map(addOnRows.map((r) => [`${r.storeId}:${r.menuItemCloudId}:${r.addOnCloudId}`, r])).values()
      );
      if (dedupedAddOnRows.length > 0) {
        await tx.cloudMenuItemAddOn.createMany({ data: dedupedAddOnRows });
      }

      // Sync substitutes: prefer flat substitutes over groups
      const flatSubstitutes = data.substitutes ?? [];
      const substituteGroups = data.substituteGroups ?? [];

      if (flatSubstitutes.length > 0) {
        for (const s of flatSubstitutes) {
          await tx.cloudSubstitute.upsert({
            where: { cloudId: s.id },
            create: { cloudId: s.id, storeId, name: s.name, priceCents: 0, sortOrder: s.sortOrder ?? 0 },
            update: { name: s.name, sortOrder: s.sortOrder ?? 0 },
          });
        }
        await tx.cloudSubstitutePrice.deleteMany({ where: { storeId } });
        const substitutePrices = data.substitutePrices ?? [];
        const validSubstituteCloudIds = new Set(flatSubstitutes.map((s) => s.id));
        const validSizeCloudIds = new Set((data.menuSizes ?? []).map((s) => s.id));
        const validRows = substitutePrices.filter(
          (p) => validSubstituteCloudIds.has(p.substituteId) && validSizeCloudIds.has(p.sizeId)
        );
        const skipped = substitutePrices.length - validRows.length;
        if (skipped > 0) {
          const missingSubstitute = substitutePrices
            .filter((p) => !validSubstituteCloudIds.has(p.substituteId))
            .map((p) => p.substituteId);
          const missingSize = substitutePrices
            .filter((p) => !validSizeCloudIds.has(p.sizeId))
            .map((p) => p.sizeId);
          const sampleSub = [...new Set(missingSubstitute)].slice(0, 5);
          const sampleSize = [...new Set(missingSize)].slice(0, 5);
          console.warn("[SyncCatalog] cloudSubstitutePrice: skipped rows with missing parent references", {
            skipped,
            totalReceived: substitutePrices.length,
            sampleMissingSubstituteIds: sampleSub,
            sampleMissingSizeIds: sampleSize,
          });
        }
        if (validRows.length > 0) {
          await tx.cloudSubstitutePrice.createMany({
            data: validRows.map((p) => ({
              storeId,
              substituteCloudId: p.substituteId,
              sizeCloudId: p.sizeId,
              mode: p.mode,
              priceCents: p.priceCents,
            })),
          });
        }
        await tx.cloudSubstituteRecipeConsumption.deleteMany({ where: { storeId } });
        const recipeConsumptions = data.substituteRecipeConsumptions ?? [];
        const validRecipeRows = recipeConsumptions.filter(
          (r) => validSubstituteCloudIds.has(r.substituteId) && validSizeCloudIds.has(r.sizeId)
        );
        if (validRecipeRows.length > 0) {
          const validIngredientCloudIds = new Set((data.ingredients ?? []).map((i: { id: string }) => i.id));
          const recipeRowsWithIngredient = validRecipeRows.filter((r) => validIngredientCloudIds.has(r.ingredientId));
          if (recipeRowsWithIngredient.length < validRecipeRows.length) {
            console.warn("[SyncCatalog] cloudSubstituteRecipeConsumption: skipped rows with missing ingredient", {
              skipped: validRecipeRows.length - recipeRowsWithIngredient.length,
            });
          }
          await tx.cloudSubstituteRecipeConsumption.createMany({
            data: recipeRowsWithIngredient.map((r) => ({
              storeId,
              substituteCloudId: r.substituteId,
              sizeCloudId: r.sizeId,
              mode: r.mode,
              ingredientCloudId: r.ingredientId,
              qtyPerItem: r.qtyPerItem,
              unitCode: r.unitCode,
            })),
          });
        }
        await tx.cloudMenuItemSubstitute.deleteMany({ where: { storeId } });
        const subLinks = data.menuItemSubstitutes ?? [];
        const subRows: Array<{ storeId: string; menuItemCloudId: string; substituteCloudId: string }> = subLinks.map((l) => ({
          storeId,
          menuItemCloudId: l.itemId,
          substituteCloudId: l.substituteId,
        }));
        const dedupedSubRows = Array.from(
          new Map(subRows.map((r) => [`${r.storeId}:${r.menuItemCloudId}:${r.substituteCloudId}`, r])).values()
        );
        if (dedupedSubRows.length > 0) {
          await tx.cloudMenuItemSubstitute.createMany({ data: dedupedSubRows });
        }
      } else {
        for (const g of substituteGroups) {
          for (const o of g.options ?? []) {
            await tx.cloudSubstitute.upsert({
              where: { cloudId: o.id },
              create: { cloudId: o.id, storeId, name: o.name, priceCents: o.priceCents ?? 0, sortOrder: o.sortOrder ?? 0 },
              update: { name: o.name, priceCents: o.priceCents ?? 0, sortOrder: o.sortOrder ?? 0 },
            });
          }
        }
        const subOptionsByGroup = new Map<string, Array<{ id: string }>>();
        for (const g of substituteGroups) {
          subOptionsByGroup.set(g.id, g.options?.map((o) => ({ id: o.id })) ?? []);
        }
        await tx.cloudMenuItemSubstitute.deleteMany({ where: { storeId } });
        const subGroupLinks = data.menuItemSubstituteGroups ?? [];
        const subRows: Array<{ storeId: string; menuItemCloudId: string; substituteCloudId: string }> = [];
        for (const l of subGroupLinks) {
          const opts = subOptionsByGroup.get(l.groupId) ?? [];
          for (const o of opts) {
            subRows.push({ storeId, menuItemCloudId: l.itemId, substituteCloudId: o.id });
          }
        }
        const dedupedSubRows = Array.from(
          new Map(subRows.map((r) => [`${r.storeId}:${r.menuItemCloudId}:${r.substituteCloudId}`, r])).values()
        );
        if (dedupedSubRows.length > 0) {
          await tx.cloudMenuItemSubstitute.createMany({ data: dedupedSubRows });
        }
      }

      for (const o of data.menuOptions ?? []) {
        await tx.cloudMenuOption.upsert({
          where: { cloudId: o.id },
          create: {
            cloudId: o.id,
            storeId,
            name: o.name,
            priceDelta: o.priceDelta,
            groupCloudId: o.groupId,
          },
          update: {
            name: o.name,
            priceDelta: o.priceDelta,
            groupCloudId: o.groupId,
          },
        });
      }

      await tx.cloudMenuItemOptionGroup.deleteMany({ where: { storeId } });
      const links = data.menuItemOptionGroups ?? [];
      if (links.length > 0) {
        await tx.cloudMenuItemOptionGroup.createMany({
          data: links.map((link) => ({
            storeId,
            menuItemCloudId: link.itemId,
            groupCloudId: link.groupId,
          })),
        });
      }

      for (const s of data.menuItemSizes ?? []) {
        if (!s.isActive) continue;
        await tx.cloudMenuItemSize.upsert({
          where: { cloudId: s.id },
          create: {
            cloudId: s.id,
            storeId,
            menuItemCloudId: s.menuItemId,
            label: s.label,
            temp: s.temp ?? "ANY",
            sortOrder: s.sortOrder ?? 0,
            isActive: true,
          },
          update: {
            label: s.label,
            temp: s.temp ?? "ANY",
            sortOrder: s.sortOrder ?? 0,
            isActive: true,
          },
        });
      }

      // Sync per-item size prices
      await tx.cloudMenuItemSizePrice.deleteMany({ where: { storeId } });
      for (const p of data.menuItemSizePrices ?? []) {
        await tx.cloudMenuItemSizePrice.upsert({
          where: { cloudId: p.id },
          create: {
            cloudId: p.id,
            storeId,
            menuItemCloudId: p.menuItemId,
            baseType: p.baseType,
            sizeOptionCloudId: p.sizeOptionId,
            sizeCode: p.sizeCode,
            priceCents: p.priceCents,
          },
          update: {
            menuItemCloudId: p.menuItemId,
            baseType: p.baseType,
            sizeOptionCloudId: p.sizeOptionId,
            sizeCode: p.sizeCode,
            priceCents: p.priceCents,
          },
        });
      }

      for (const ing of data.ingredients) {
        await tx.cloudIngredient.upsert({
          where: { cloudId: ing.id },
          create: {
            cloudId: ing.id,
            storeId,
            name: ing.name,
            unitCode: ing.unitCode,
            isActive: ing.isActive,
            version: ing.version,
            imageUrl: ing.imageUrl ?? null,
            deletedAt: ing.deletedAt ? new Date(ing.deletedAt) : null,
          },
          update: {
            name: ing.name,
            unitCode: ing.unitCode,
            isActive: ing.isActive,
            version: ing.version,
            imageUrl: ing.imageUrl ?? null,
            deletedAt: ing.deletedAt ? new Date(ing.deletedAt) : null,
          },
        });
        ingredientsUpserted++;
      }

      for (const rl of data.recipeLines) {
        await tx.cloudRecipeLine.upsert({
          where: { cloudId: rl.id },
          create: {
            cloudId: rl.id,
            storeId,
            menuItemCloudId: rl.menuItemId,
            ingredientCloudId: rl.ingredientId,
            qtyPerItem: rl.qtyPerItem,
            unitCode: rl.unitCode,
            version: rl.version,
            deletedAt: rl.deletedAt ? new Date(rl.deletedAt) : null,
          },
          update: {
            menuItemCloudId: rl.menuItemId,
            ingredientCloudId: rl.ingredientId,
            qtyPerItem: rl.qtyPerItem,
            unitCode: rl.unitCode,
            version: rl.version,
            deletedAt: rl.deletedAt ? new Date(rl.deletedAt) : null,
          },
        });
        recipeLinesUpserted++;
      }

      // Sync per-size recipe consumption
      await tx.cloudRecipeLineSize.deleteMany({ where: { storeId } });
      for (const rls of data.recipeLineSizes ?? []) {
        if (rls.deletedAt) continue;
        await tx.cloudRecipeLineSize.upsert({
          where: {
            storeId_menuItemCloudId_ingredientCloudId_baseType_sizeCode: {
              storeId,
              menuItemCloudId: rls.menuItemId,
              ingredientCloudId: rls.ingredientId,
              baseType: rls.baseType,
              sizeCode: rls.sizeCode,
            },
          },
          create: {
            cloudId: rls.id,
            storeId,
            menuItemCloudId: rls.menuItemId,
            ingredientCloudId: rls.ingredientId,
            baseType: rls.baseType,
            sizeCode: rls.sizeCode,
            qtyPerItem: rls.qtyPerItem,
            unitCode: rls.unitCode,
            version: rls.version,
            deletedAt: rls.deletedAt ? new Date(rls.deletedAt) : null,
          },
          update: {
            qtyPerItem: rls.qtyPerItem,
            unitCode: rls.unitCode,
            version: rls.version,
            deletedAt: rls.deletedAt ? new Date(rls.deletedAt) : null,
          },
        });
        recipeLineSizesUpserted++;
      }

      // Sync store settings (admin PIN for offline verification)
      if (data.storeSettings) {
        await tx.cloudStoreSetting.upsert({
          where: { id: "1" },
          create: {
            id: "1",
            adminPinHash: data.storeSettings.adminPinHash ?? null,
          },
          update: {
            adminPinHash: data.storeSettings.adminPinHash ?? null,
          },
        });
      }

      await tx.syncState.upsert({
        where: { branchId },
        create: {
          branchId,
          catalogVersion: data.latestVersion,
          lastSyncAt: new Date(),
        },
        update: {
          catalogVersion: data.latestVersion,
          lastSyncAt: new Date(),
        },
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `Local sync persistence error: ${msg}`,
      code: 500,
    };
  }

  return {
    ok: true,
    result: {
      latestVersion: data.latestVersion,
      itemsUpserted,
      ingredientsUpserted,
      recipeLinesUpserted,
      recipeLineSizesUpserted,
      transactionTypesUpserted,
      shotPricingRulesUpserted,
    },
  };
}

export function requireAdminRole(req: { staff?: { role?: string } }): boolean {
  const staff = req.staff;
  if (!staff) return false;
  const role = (staff.role ?? "").toUpperCase();
  return ADMIN_ROLES.includes(role);
}
