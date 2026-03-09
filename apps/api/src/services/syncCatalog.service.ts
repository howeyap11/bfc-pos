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

type SyncResponse = {
  latestVersion: number;
  items: CloudItem[];
  ingredients: CloudIngredient[];
  recipeLines: CloudRecipeLine[];
  categories?: CloudCategory[];
  subCategories?: CloudSubCategory[];
  menuOptionGroups?: CloudMenuOptionGroup[];
  menuOptions?: CloudMenuOption[];
  menuItemOptionGroups?: CloudMenuItemOptionGroup[];
  menuItemSizes?: CloudMenuItemSize[];
  menuItemSizePrices?: CloudMenuItemSizePrice[];
};

export type SyncCatalogResult = {
  latestVersion: number;
  itemsUpserted: number;
  ingredientsUpserted: number;
  recipeLinesUpserted: number;
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
          },
          update: { name: g.name, required: g.required, multi: g.multi, isSizeGroup: g.isSizeGroup ?? false },
        });
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
            deletedAt: ing.deletedAt ? new Date(ing.deletedAt) : null,
          },
          update: {
            name: ing.name,
            unitCode: ing.unitCode,
            isActive: ing.isActive,
            version: ing.version,
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
    },
  };
}

export function requireAdminRole(req: { staff?: { role?: string } }): boolean {
  const staff = req.staff;
  if (!staff) return false;
  const role = (staff.role ?? "").toUpperCase();
  return ADMIN_ROLES.includes(role);
}
