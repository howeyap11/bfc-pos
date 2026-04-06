import type { PrismaClient } from "@prisma/client";

export const SIZES_GROUP_NAME = "Sizes";
const SIZES_SETTING_GROUP_KEY = "SIZES";

export type DrinkSizeOption = {
  id: string;
  label: string;
  sortOrder: number;
};

export type DrinkSizesResult =
  | { ok: true; optionGroupId: string; optionGroupName: string; options: DrinkSizeOption[] }
  | { ok: false; error: string };

type MenuOptionDb = Pick<PrismaClient, "menuOption">;

/**
 * Fetches the Sizes option group (system group for drink sizes).
 * Returns every MenuOption in that group — used for validating item default size / drink-size PUT
 * so legacy option ids remain valid even when not in the current MenuSize catalog.
 */
export async function getDrinkSizesOptionGroup(
  prisma: PrismaClient
): Promise<DrinkSizesResult> {
  const group = await prisma.menuOptionGroup.findFirst({
    where: { name: SIZES_GROUP_NAME, isSizeGroup: true },
    include: {
      options: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!group) {
    return {
      ok: false,
      error: `Missing required option group: ${SIZES_GROUP_NAME}. Run db:seed to create it.`,
    };
  }

  const options: DrinkSizeOption[] = group.options.map((o: { id: string; name: string; sortOrder: number | null }, i: number) => ({
    id: o.id,
    label: o.name,
    sortOrder: o.sortOrder ?? i,
  }));

  return {
    ok: true,
    optionGroupId: group.id,
    optionGroupName: group.name,
    options,
  };
}

/** Returns the set of valid option IDs from Sizes group for validation. */
export async function getDrinkSizesOptionIds(
  prisma: PrismaClient
): Promise<{ ok: true; optionIds: Set<string> } | { ok: false; error: string }> {
  const result = await getDrinkSizesOptionGroup(prisma);
  if (!result.ok) return result;
  const optionIds = new Set(result.options.map((o) => o.id));
  return { ok: true, optionIds };
}

async function getSizesMenuOptionGroupId(prisma: Pick<PrismaClient, "menuOptionGroup">): Promise<string | null> {
  const g = await prisma.menuOptionGroup.findFirst({
    where: { name: SIZES_GROUP_NAME, isSizeGroup: true },
    select: { id: true },
  });
  return g?.id ?? null;
}

/**
 * Resolve a MenuOption row for a MenuSize row (label + sortOrder first, then name-only for legacy seeds).
 */
export async function findMenuOptionForMenuSize(
  prisma: MenuOptionDb,
  sizesGroupId: string,
  menuSize: { label: string; sortOrder: number }
): Promise<{ id: string } | null> {
  const exact = await prisma.menuOption.findFirst({
    where: { groupId: sizesGroupId, name: menuSize.label, sortOrder: menuSize.sortOrder },
    select: { id: true },
  });
  if (exact) return exact;
  const byName = await prisma.menuOption.findFirst({
    where: { groupId: sizesGroupId, name: menuSize.label },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  return byName;
}

export async function ensureMenuOptionForMenuSizeRow(
  prisma: MenuOptionDb,
  sizesGroupId: string,
  menuSize: { label: string; sortOrder: number }
): Promise<{ id: string; created: boolean }> {
  const existing = await findMenuOptionForMenuSize(prisma, sizesGroupId, menuSize);
  if (existing) return { id: existing.id, created: false };
  const created = await prisma.menuOption.create({
    data: {
      groupId: sizesGroupId,
      name: menuSize.label,
      priceDelta: 0,
      sortOrder: menuSize.sortOrder,
    },
    select: { id: true },
  });
  return { id: created.id, created: true };
}

export type DrinkSizesCatalogResult =
  | { ok: false; error: string }
  | {
      ok: true;
      optionGroupId: string;
      optionGroupName: string;
      options: DrinkSizeOption[];
      createdOptionCount: number;
    };

/**
 * Catalog for Cloud Admin Items UI: one entry per active MenuSize (Menu Settings source of truth),
 * with stable MenuOption ids used by MenuItemDrinkSizeConfig / POS sync.
 */
export async function getDrinkSizesCatalogForAdminUi(prisma: PrismaClient): Promise<DrinkSizesCatalogResult> {
  const sizesGroupId = await getSizesMenuOptionGroupId(prisma);
  if (!sizesGroupId) {
    return {
      ok: false,
      error: `Missing required option group: ${SIZES_GROUP_NAME}. Run db:seed to create it.`,
    };
  }

  const menuSettingGroup = await prisma.menuSettingGroup.findUnique({
    where: { key: SIZES_SETTING_GROUP_KEY },
    include: {
      menuSizes: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  if (!menuSettingGroup) {
    return { ok: false, error: "Menu Sizes settings not found. Run db:seed." };
  }

  const optionGroupMeta = await prisma.menuOptionGroup.findFirst({
    where: { id: sizesGroupId },
    select: { id: true, name: true },
  });
  if (!optionGroupMeta) {
    return { ok: false, error: `Missing required option group: ${SIZES_GROUP_NAME}. Run db:seed to create it.` };
  }

  const options: DrinkSizeOption[] = [];
  let createdOptionCount = 0;

  for (const ms of menuSettingGroup.menuSizes) {
    const row = await ensureMenuOptionForMenuSizeRow(prisma, sizesGroupId, {
      label: ms.label,
      sortOrder: ms.sortOrder,
    });
    if (row.created) createdOptionCount++;
    options.push({
      id: row.id,
      label: ms.label,
      sortOrder: ms.sortOrder,
    });
  }

  return {
    ok: true,
    optionGroupId: optionGroupMeta.id,
    optionGroupName: optionGroupMeta.name,
    options,
    createdOptionCount,
  };
}
