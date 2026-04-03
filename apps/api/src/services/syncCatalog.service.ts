import type { Prisma, PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import {
  DEFAULT_WORK_DAY_FROM_TIME_LOCAL,
  DEFAULT_WORK_DAY_TO_TIME_LOCAL,
} from "../lib/staffBusinessDate";

const CLOUD_URL = process.env.CLOUD_URL ?? "";
const ADMIN_ROLES = ["ADMIN", "OIC", "AUDITOR", "MANAGER"];

async function ensureLocalIngredientFromCloud(
  tx: Prisma.TransactionClient,
  storeId: string,
  cloudIng: { id: string; name: string; unitCode: string }
) {
  const code = cloudIng.unitCode.trim() || "UNIT";
  const unit = await tx.inventoryUnit.upsert({
    where: { storeId_code: { storeId, code } },
    create: { storeId, code, name: code },
    update: {},
  });
  const byCloud = await tx.ingredient.findFirst({
    where: { cloudIngredientCloudId: cloudIng.id },
  });
  if (byCloud) {
    await tx.ingredient.update({
      where: { id: byCloud.id },
      data: { name: cloudIng.name.trim() || byCloud.name, unitId: unit.id },
    });
    return;
  }
  const baseName = cloudIng.name.trim() || cloudIng.id;
  const byName = await tx.ingredient.findFirst({
    where: { storeId, name: baseName },
  });
  if (byName && !byName.cloudIngredientCloudId) {
    await tx.ingredient.update({
      where: { id: byName.id },
      data: { cloudIngredientCloudId: cloudIng.id, unitId: unit.id },
    });
    return;
  }
  let name = baseName;
  let n = 0;
  while (await tx.ingredient.findFirst({ where: { storeId, name } })) {
    n++;
    name = `${baseName} (${n})`;
  }
  await tx.ingredient.create({
    data: {
      storeId,
      name,
      unitId: unit.id,
      cloudIngredientCloudId: cloudIng.id,
      isActive: true,
    },
  });
}

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
  includedShots?: number | null;
};

type CloudCategory = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  deletedAt?: string | null;
};

type CloudSubCategory = {
  id: string;
  name: string;
  categoryId: string;
  sortOrder: number;
  deletedAt?: string | null;
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
  extraShotIngredientId?: string | null;
  qtyPerExtraShot?: string | null;
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
  optionChoiceRecipeLines?: Array<{
    id: string;
    optionId: string;
    ingredientId: string;
    qtyPerItem: string;
    unitCode: string;
  }>;
  legacyAddOns?: Array<{
    id: string;
    recipeLines: Array<{ ingredientId: string; qtyPerItem: string; unitCode: string }>;
  }>;
  storeSettings?: {
    adminPinHash: string | null;
    ownerPasswordHash?: string | null;
    workDayFromTimeLocal?: string;
    workDayToTimeLocal?: string;
  };
  staff?: Array<{
    id: string;
    name: string;
    email?: string | null;
    passcode: string;
    passcodeHash?: string | null;
    role: string;
    isActive: boolean;
    updatedAt: string;
  }>;
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
  console.log("[startup] syncCatalogFromCloud: started");
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
    let syncState: { catalogVersion: number };
    const maxAttempts = 3;
    const retryDelayMs = 15000;
    let lastAttemptAt = 0;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const now = Date.now();
      const durationSinceLast = lastAttemptAt > 0 ? now - lastAttemptAt : 0;
      const isRetry = attempt > 0;
      const instanceId = (prisma as any)._bfcInstanceId ?? "unknown";
      console.log("[startup] syncCatalogFromCloud: about to syncState.upsert", { attempt: attempt + 1 });
      console.warn("[syncState.upsert] write-lock visibility", {
        timestamp: now,
        attempt: attempt + 1,
        durationSinceLastMs: durationSinceLast,
        isRetry,
        prismaInstanceId: instanceId,
      });
      try {
        syncState = await prisma.syncState.upsert({
          where: { branchId },
          create: { branchId, catalogVersion: 0 },
          update: {},
        });
        console.log("[startup] syncCatalogFromCloud: syncState.upsert done", { catalogVersion: syncState.catalogVersion });
        break;
      } catch (upsertErr: unknown) {
        lastAttemptAt = Date.now();
        const isP1008 = upsertErr && typeof (upsertErr as any).code === "string" && (upsertErr as any).code === "P1008";
        const isTimeout = isP1008 || /timeout/i.test(String(upsertErr));
        if (attempt < maxAttempts - 1 && isTimeout) {
          try {
            await prisma.$disconnect();
            await prisma.$connect();
            await prisma.$queryRawUnsafe("PRAGMA busy_timeout=30000");
          } catch (_) {}
          await new Promise((r) => setTimeout(r, retryDelayMs));
          continue;
        }
        throw upsertErr;
      }
    }
    sinceVersion = syncState!.catalogVersion;
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
    const base = CLOUD_URL.replace(/\/$/, "");
    const url = `${base}/sync/catalog?sinceVersion=${sinceVersion}`;
    // #region agent log
    try {
      const parsed = base ? new URL(base + "/") : null;
      const cloudHost = parsed?.host ?? "EMPTY";
      const cloudPath = parsed?.pathname ?? "";
      fetch("http://127.0.0.1:7330/ingest/e360f4f2-ab8d-4cc6-b94b-f45235f7b95a", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "e7ca7a" },
        body: JSON.stringify({
          sessionId: "e7ca7a",
          location: "syncCatalog.service.ts:preFetch",
          message: "catalog sync request",
          data: {
            cloudHost,
            cloudPathFromUrl: cloudPath || "(root)",
            fullRequestPath: base ? new URL(url).pathname : "N/A",
            method: "GET",
            hypothesisId: "H1",
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    } catch (_) {}
    // #endregion
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(30000),
    });
    // #region agent log
    try {
      const cloudHost = base ? new URL(base + "/").host : "EMPTY";
      fetch("http://127.0.0.1:7330/ingest/e360f4f2-ab8d-4cc6-b94b-f45235f7b95a", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "e7ca7a" },
        body: JSON.stringify({
          sessionId: "e7ca7a",
          location: "syncCatalog.service.ts:postFetch",
          message: "catalog sync response",
          data: { status: res.status, ok: res.ok, cloudHost, path: "/sync/catalog" },
          timestamp: Date.now(),
          hypothesisId: res.status === 404 ? "H1" : res.ok ? "H0" : "H4",
        }),
      }).catch(() => {});
    } catch (_) {}
    // #endregion

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
      optionChoiceRecipeLinesReceived: (data.optionChoiceRecipeLines ?? []).length,
      legacyAddOnsReceived: (data.legacyAddOns ?? []).length,
      addOnGroupsReceived: (data.addOnGroups ?? []).length,
      substituteGroupsReceived: (data.substituteGroups ?? []).length,
      substitutesReceived: (data.substitutes ?? []).length,
      substitutePricesReceived: (data.substitutePrices ?? []).length,
      substituteRecipeConsumptionsReceived: (data.substituteRecipeConsumptions ?? []).length,
      menuItemSubstitutesReceived: (data.menuItemSubstitutes ?? []).length,
      menuItemAddOnGroupsReceived: (data.menuItemAddOnGroups ?? []).length,
      menuItemSubstituteGroupsReceived: (data.menuItemSubstituteGroups ?? []).length,
      staffReceived: (data.staff ?? []).length,
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
      // Ensure Store exists before Staff sync (Staff.storeId FK -> Store.id)
      await tx.store.upsert({
        where: { id: storeId },
        update: {},
        create: {
          id: storeId,
          code: storeId === "store_1" ? "BFC-LOCAL" : storeId,
          name: storeId === "store_1" ? "But First, Coffee (Local)" : `Store ${storeId}`,
        },
      });

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

      // Sync per-item drink size configs (mode + optionId). Only replace configs for items in this batch.
      // On incremental sync data.items contains only changed items; deleting all would wipe configs for unchanged items.
      const itemIdsInBatch = data.items.map((i) => i.id);
      if (itemIdsInBatch.length > 0) {
        await tx.cloudMenuItemDrinkSizeConfig.deleteMany({
          where: { storeId, menuItemCloudId: { in: itemIdsInBatch } },
        });
      }
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

      if (itemIdsInBatch.length > 0) {
        await tx.cloudMenuItemDrinkModeDefault.deleteMany({
          where: { storeId, menuItemCloudId: { in: itemIdsInBatch } },
        });
      }
      for (const i of data.items) {
        const dmds = i.drinkModeDefaults ?? [];
        for (const d of dmds) {
          const mode = (d.mode || "").toUpperCase();
          if (!mode || !d.defaultOptionId) continue;
          await tx.cloudMenuItemDrinkModeDefault.upsert({
            where: {
              storeId_menuItemCloudId_mode: {
                storeId,
                menuItemCloudId: i.id,
                mode,
              },
            },
            create: {
              storeId,
              menuItemCloudId: i.id,
              mode,
              defaultOptionCloudId: d.defaultOptionId,
            },
            update: { defaultOptionCloudId: d.defaultOptionId },
          });
        }
      }

      const validCategories = (data.categories ?? []).filter((c) => !c.deletedAt);
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

      const validSubCategories = (data.subCategories ?? []).filter((s) => !s.deletedAt);
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
            extraShotIngredientCloudId: sr.extraShotIngredientId ?? null,
            qtyPerExtraShot: sr.qtyPerExtraShot ?? null,
          },
          update: {
            name: sr.name ?? "Standard",
            shotsPerBundle: sr.shotsPerBundle ?? 2,
            priceCentsPerBundle: sr.priceCentsPerBundle ?? 4000,
            isActive: sr.isActive !== false,
            sortOrder: sr.sortOrder ?? 0,
            extraShotIngredientCloudId: sr.extraShotIngredientId ?? null,
            qtyPerExtraShot: sr.qtyPerExtraShot ?? null,
          },
        });
        shotPricingRulesUpserted++;
      }

      /**
       * Offline consumption (localConsumption.service): mirrors cloud option resolution into CloudOptionRecipeLine.
       * Cloud /sync/catalog always sends full rows for these (not version-delta); we replace per store each sync.
       * - CHOICE: MenuOption ids from optionChoiceRecipeLines (plain { id } rows in optionsJson)
       * - ADDON_OPT: AddOnOption ids + recipeLines from addOnGroups.options
       * - ADDON: legacy AddOn ids + recipeLines from legacyAddOns
       * - SUB_OPT: SubstituteOption ids + recipeLines from substituteGroups.options (before SubstituteRecipeConsumption fallback)
       */
      await tx.cloudOptionRecipeLine.deleteMany({ where: { storeId } });
      const optionRecipeRows: Prisma.CloudOptionRecipeLineCreateManyInput[] = [];
      for (const r of data.optionChoiceRecipeLines ?? []) {
        optionRecipeRows.push({
          storeId,
          sourceKind: "CHOICE",
          entityCloudId: r.optionId,
          ingredientCloudId: r.ingredientId,
          qtyPerItem: r.qtyPerItem,
          unitCode: r.unitCode,
        });
      }
      for (const g of data.addOnGroups ?? []) {
        for (const o of g.options ?? []) {
          for (const rl of o.recipeLines ?? []) {
            optionRecipeRows.push({
              storeId,
              sourceKind: "ADDON_OPT",
              entityCloudId: o.id,
              ingredientCloudId: rl.ingredientId,
              qtyPerItem: rl.qtyPerItem,
              unitCode: rl.unitCode,
            });
          }
        }
      }
      for (const a of data.legacyAddOns ?? []) {
        for (const rl of a.recipeLines ?? []) {
          optionRecipeRows.push({
            storeId,
            sourceKind: "ADDON",
            entityCloudId: a.id,
            ingredientCloudId: rl.ingredientId,
            qtyPerItem: rl.qtyPerItem,
            unitCode: rl.unitCode,
          });
        }
      }
      for (const g of data.substituteGroups ?? []) {
        for (const o of g.options ?? []) {
          for (const rl of o.recipeLines ?? []) {
            optionRecipeRows.push({
              storeId,
              sourceKind: "SUB_OPT",
              entityCloudId: o.id,
              ingredientCloudId: rl.ingredientId,
              qtyPerItem: rl.qtyPerItem,
              unitCode: rl.unitCode,
            });
          }
        }
      }
      if (optionRecipeRows.length > 0) {
        await tx.cloudOptionRecipeLine.createMany({ data: optionRecipeRows });
      }
      console.log("[SyncCatalog] CloudOptionRecipeLine rows persisted:", optionRecipeRows.length);

      // Sync add-ons from groups (flatten options to CloudAddOn for POS consumption)
      const addOnGroups = data.addOnGroups ?? [];
      for (const g of addOnGroups) {
        const gSort = g.sortOrder ?? 0;
        const gName = (g.name ?? "").trim() || "Add-ons";
        for (const o of g.options ?? []) {
          await tx.cloudAddOn.upsert({
            where: { cloudId: o.id },
            create: {
              cloudId: o.id,
              storeId,
              name: o.name,
              priceCents: o.priceCents ?? 0,
              sortOrder: o.sortOrder ?? 0,
              addOnGroupCloudId: g.id,
              addOnGroupName: gName,
              addOnGroupSortOrder: gSort,
            },
            update: {
              name: o.name,
              priceCents: o.priceCents ?? 0,
              sortOrder: o.sortOrder ?? 0,
              addOnGroupCloudId: g.id,
              addOnGroupName: gName,
              addOnGroupSortOrder: gSort,
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

      // Flat SubstituteRecipeConsumption rows reference flat Substitute ids only. Clear every sync so group-only
      // catalogs do not leave stale legacy consumption rows from a previous flat-substitute menu.
      await tx.cloudSubstituteRecipeConsumption.deleteMany({ where: { storeId } });

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
          // Set CloudSubstitute.priceCents from synced prices so POS and transaction pricing get a single upcharge value (cloud does not send priceCents on substitute object)
          const minPriceBySub = new Map<string, number>();
          for (const p of validRows) {
            const cur = minPriceBySub.get(p.substituteId);
            minPriceBySub.set(p.substituteId, cur === undefined ? p.priceCents : Math.min(cur, p.priceCents));
          }
          for (const subId of validSubstituteCloudIds) {
            const priceCents = minPriceBySub.get(subId);
            if (priceCents !== undefined) {
              await tx.cloudSubstitute.updateMany({
                where: { cloudId: subId, storeId },
                data: { priceCents },
              });
            }
          }
        }
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
            includedShots: p.includedShots ?? null,
          },
          update: {
            menuItemCloudId: p.menuItemId,
            baseType: p.baseType,
            sizeOptionCloudId: p.sizeOptionId,
            sizeCode: p.sizeCode,
            priceCents: p.priceCents,
            includedShots: p.includedShots ?? null,
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
        if (ing.isActive && !ing.deletedAt) {
          await ensureLocalIngredientFromCloud(tx, storeId, {
            id: ing.id,
            name: ing.name,
            unitCode: ing.unitCode,
          });
        }
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

      // Per-size recipe overrides: upsert only — never delete-all (incremental /sync/catalog may omit unchanged rows;
      // deleteMany would wipe local data needed for offline consumption).
      for (const rls of data.recipeLineSizes ?? []) {
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
            cloudId: rls.id,
            qtyPerItem: rls.qtyPerItem,
            unitCode: rls.unitCode,
            version: rls.version,
            deletedAt: rls.deletedAt ? new Date(rls.deletedAt) : null,
          },
        });
        recipeLineSizesUpserted++;
      }

      // Sync store settings (admin PIN + owner password for offline verification)
      if (data.storeSettings) {
        await tx.cloudStoreSetting.upsert({
          where: { id: "1" },
          create: {
            id: "1",
            adminPinHash: data.storeSettings.adminPinHash ?? null,
            ownerPasswordHash: data.storeSettings.ownerPasswordHash ?? null,
            workDayFromTimeLocal: data.storeSettings.workDayFromTimeLocal ?? DEFAULT_WORK_DAY_FROM_TIME_LOCAL,
            workDayToTimeLocal: data.storeSettings.workDayToTimeLocal ?? DEFAULT_WORK_DAY_TO_TIME_LOCAL,
          },
          update: {
            adminPinHash: data.storeSettings.adminPinHash ?? null,
            ownerPasswordHash: data.storeSettings.ownerPasswordHash ?? null,
            workDayFromTimeLocal: data.storeSettings.workDayFromTimeLocal ?? DEFAULT_WORK_DAY_FROM_TIME_LOCAL,
            workDayToTimeLocal: data.storeSettings.workDayToTimeLocal ?? DEFAULT_WORK_DAY_TO_TIME_LOCAL,
          },
        });
      }

      // Sync staff from Cloud Admin (source of truth for names, PINs, email, roles)
      // Staff depends on Store (storeId FK); Store is ensured above.
      if (data.staff && Array.isArray(data.staff) && prisma.staff) {
        const validRoles = ["HEAD_BARISTA", "HEAD_CHEF", "BARISTA", "LEAD_BARISTA", "MANAGER", "KITCHEN_STAFF", "ADMIN"];
        for (const s of data.staff) {
          try {
            const cloudId = s.id;
            const name = String(s.name ?? "").trim();
            const email =
              s.email != null && String(s.email).trim() !== ""
                ? String(s.email).trim().toLowerCase()
                : null;
            const passcode = String(s.passcode ?? "").trim();
            const passcodeHash =
              s.passcodeHash != null && String(s.passcodeHash).trim() !== "" ? String(s.passcodeHash).trim() : null;
            const role = validRoles.includes(String(s.role ?? "").trim()) ? String(s.role).trim() : "BARISTA";
            const isActive = !!s.isActive;
            if (!name || (!passcode && !passcodeHash)) continue;
            const existingByCloudId = await tx.staff.findUnique({ where: { cloudId } });
            if (existingByCloudId) {
              await tx.staff.update({
                where: { id: existingByCloudId.id },
                data: { name, email, passcode, passcodeHash, role, isActive, updatedAt: new Date() },
              });
              continue;
            }
            const existingByName = await tx.staff.findUnique({
              where: { storeId_name: { storeId, name } },
            });
            if (existingByName) {
              await tx.staff.update({
                where: { id: existingByName.id },
                data: { cloudId, email, passcode, passcodeHash, role, isActive, updatedAt: new Date() },
              });
              continue;
            }
            const newKey = "staff_" + randomBytes(16).toString("hex");
            await tx.staff.upsert({
              where: { storeId_name: { storeId, name } },
              create: {
                storeId,
                cloudId,
                name,
                email,
                passcode,
                passcodeHash,
                role,
                isActive,
                key: newKey,
              },
              update: {
                cloudId,
                email,
                passcode,
                passcodeHash,
                role,
                isActive,
                key: newKey,
                updatedAt: new Date(),
              },
            });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.warn(
              "[SyncCatalog] Skipping staff due to missing FK dependency or constraint:",
              { staffId: s.id, staffName: s.name, storeId, error: msg }
            );
            // Never throw: skip invalid staff so catalog sync completes; POS remains usable
          }
        }
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
