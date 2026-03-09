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
  try {
    const syncState = await prisma.syncState.upsert({
      where: { branchId },
      create: { branchId, catalogVersion: 0 },
      update: {},
    });
    const sinceVersion = syncState.catalogVersion;

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
              mode: c.mode,
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
        // #region agent log
        fetch('http://127.0.0.1:7330/ingest/e360f4f2-ab8d-4cc6-b94b-f45235f7b95a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'347516'},body:JSON.stringify({sessionId:'347516',location:'syncCatalog.service.ts:menuSize',message:'menuSize payload',data:{id:ms.id,groupId:ms.groupId,hasGroupId:typeof (ms as any).groupId,keys:Object.keys(ms)},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        const groupCloudId = (ms as { groupId?: string }).groupId ?? null;
        if (!groupCloudId) {
          // #region agent log
          fetch('http://127.0.0.1:7330/ingest/e360f4f2-ab8d-4cc6-b94b-f45235f7b95a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'347516'},body:JSON.stringify({sessionId:'347516',location:'syncCatalog.service.ts:menuSizeSkip',message:'skipping menuSize missing groupId',data:{id:ms.id},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
          // #endregion
          continue;
        }
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
      error: `Sync failed: ${msg}`,
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
