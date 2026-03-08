import type { PrismaClient } from "../generated/client2";

export const SIZES_GROUP_NAME = "Sizes";

export type DrinkSizeOption = {
  id: string;
  label: string;
  sortOrder: number;
};

export type DrinkSizesResult =
  | { ok: true; optionGroupId: string; optionGroupName: string; options: DrinkSizeOption[] }
  | { ok: false; error: string };

/**
 * Fetches the Sizes option group (system group for drink sizes).
 * Returns options (id, label/name, sortOrder) or a clear error if missing.
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
export async function getDrinkSizesOptionIds(prisma: PrismaClient): Promise<{ ok: true; optionIds: Set<string> } | { ok: false; error: string }> {
  const result = await getDrinkSizesOptionGroup(prisma);
  if (!result.ok) return result;
  const optionIds = new Set(result.options.map((o) => o.id));
  return { ok: true, optionIds };
}
