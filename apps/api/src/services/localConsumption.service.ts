/**
 * Local operational consumption engine (apps/api): resolves ingredient quantities per transaction line
 * from synced Cloud* catalog tables only — no cloud API calls.
 *
 * Covers: base + size/temp recipe lines, option/add-on/substitute option recipes (CloudOptionRecipeLine),
 * legacy substitute matrix (CloudSubstituteRecipeConsumption), extra-shot beans (CloudShotPricingRule +
 * includedShots from CloudMenuItemSizePrice / item default). Uses structured ids from optionsJson, not labels.
 */
import type { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";

export type DrinkMode = "HOT" | "ICED" | "CONCENTRATED";

export type LocalLineConsumptionInput = {
  menuItemId: string | null | undefined;
  optionsJson: string | null | undefined;
};

type Agg = Map<string, Decimal>;

function isDrinkMode(v: string): v is DrinkMode {
  return v === "HOT" || v === "ICED" || v === "CONCENTRATED";
}

/** Exported for tests — extended vs cloud parseOptionsJson with `{ type: "shots" }` qty. */
export function parseOptionsJson(optionsJson: string | null): {
  baseType: DrinkMode | null;
  sizeLabel: string | null;
  plainOptionIds: string[];
  substituteCloudId: string | null;
  shotsQty: number;
} {
  let baseType: DrinkMode | null = null;
  let sizeLabel: string | null = null;
  const plainOptionIds: string[] = [];
  let substituteCloudId: string | null = null;
  let shotsQty = 0;
  if (!optionsJson?.trim()) {
    return { baseType, sizeLabel, plainOptionIds, substituteCloudId, shotsQty };
  }
  let arr: unknown[];
  try {
    arr = JSON.parse(optionsJson) as unknown[];
    if (!Array.isArray(arr)) return { baseType, sizeLabel, plainOptionIds, substituteCloudId, shotsQty };
  } catch {
    return { baseType, sizeLabel, plainOptionIds, substituteCloudId, shotsQty };
  }
  for (const e of arr) {
    if (!e || typeof e !== "object") continue;
    const o = e as Record<string, unknown>;
    if (o.type === "size" && typeof o.baseType === "string" && typeof o.sizeLabel === "string") {
      const bt = o.baseType.toUpperCase();
      if (isDrinkMode(bt)) baseType = bt;
      sizeLabel = o.sizeLabel;
      continue;
    }
    if (o.type === "substitute" && typeof o.cloudId === "string" && o.cloudId) {
      substituteCloudId = o.cloudId;
      continue;
    }
    if (o.type === "shots" && typeof o.qty === "number") {
      shotsQty = Math.max(0, Math.trunc(o.qty));
      continue;
    }
    if ("id" in o && typeof o.id === "string" && o.id && !o.type) {
      if (o.missing === true) continue;
      const g = typeof o.group === "string" ? o.group.toLowerCase() : "";
      const n = typeof o.name === "string" ? o.name.toLowerCase() : "";
      if (g.includes("size")) continue;
      if (g.includes("shot") || n.includes("shot") || n.includes("espresso shot")) continue;
      plainOptionIds.push(o.id);
    }
  }
  return { baseType, sizeLabel, plainOptionIds, substituteCloudId, shotsQty };
}

function addAgg(map: Agg, ingredientId: string, qty: Decimal) {
  if (qty.isZero()) return;
  const cur = map.get(ingredientId);
  map.set(ingredientId, cur ? cur.plus(qty) : qty);
}

async function accumulateBaseAndSizeRecipes(
  prisma: PrismaClient,
  storeId: string,
  menuItemCloudId: string,
  qty: number,
  baseType: DrinkMode | null,
  sizeLabel: string | null,
  into: Agg
) {
  const q = Math.max(0, Math.trunc(qty));
  if (q === 0) return;

  const [baseRows, sizeRows] = await Promise.all([
    prisma.cloudRecipeLine.findMany({
      where: { storeId, menuItemCloudId, deletedAt: null },
      select: { ingredientCloudId: true, qtyPerItem: true },
    }),
    prisma.cloudRecipeLineSize.findMany({
      where: { storeId, menuItemCloudId, deletedAt: null },
      select: { ingredientCloudId: true, qtyPerItem: true, baseType: true, sizeCode: true },
    }),
  ]);

  const labelNorm = sizeLabel?.trim().toLowerCase() ?? "";
  const applicableSize =
    baseType && labelNorm
      ? sizeRows.filter(
          (r) =>
            r.baseType === baseType &&
            (r.sizeCode === sizeLabel?.trim() || r.sizeCode.trim().toLowerCase() === labelNorm)
        )
      : [];

  const rowsToUse = applicableSize.length > 0 ? applicableSize : baseRows;

  for (const rec of rowsToUse) {
    const per = new Decimal(String(rec.qtyPerItem));
    addAgg(into, rec.ingredientCloudId, per.times(q));
  }
}

async function resolveMenuSizeCloudId(
  prisma: PrismaClient,
  storeId: string,
  sizeLabel: string | null
): Promise<string | null> {
  if (!sizeLabel?.trim()) return null;
  const rows = await prisma.cloudMenuSize.findMany({
    where: { storeId },
    select: { cloudId: true, label: true },
  });
  const n = sizeLabel.trim().toLowerCase();
  const hit = rows.find((r) => r.label.trim().toLowerCase() === n);
  return hit?.cloudId ?? null;
}

async function accumulateOptionRecipes(
  prisma: PrismaClient,
  storeId: string,
  optionIds: string[],
  qty: number,
  into: Agg
) {
  const q = Math.max(0, Math.trunc(qty));
  if (q === 0 || optionIds.length === 0) return;

  const unique = [...new Set(optionIds)];
  const rows = await prisma.cloudOptionRecipeLine.findMany({
    where: { storeId, entityCloudId: { in: unique } },
    select: { sourceKind: true, entityCloudId: true, ingredientCloudId: true, qtyPerItem: true },
  });

  const byEntity = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byEntity.get(r.entityCloudId) ?? [];
    list.push(r);
    byEntity.set(r.entityCloudId, list);
  }

  const covered = new Set<string>();
  const kinds = ["CHOICE", "ADDON_OPT", "ADDON"] as const;
  for (const optId of unique) {
    const group = byEntity.get(optId) ?? [];
    for (const kind of kinds) {
      const lines = group.filter((g) => g.sourceKind === kind);
      if (lines.length === 0) continue;
      if (covered.has(optId)) break;
      covered.add(optId);
      for (const r of lines) {
        const per = new Decimal(String(r.qtyPerItem));
        addAgg(into, r.ingredientCloudId, per.times(q));
      }
      break;
    }
  }
}

async function accumulateSubstituteRecipes(
  prisma: PrismaClient,
  storeId: string,
  substituteCloudId: string,
  qty: number,
  baseType: DrinkMode | null,
  sizeLabel: string | null,
  into: Agg
) {
  const q = Math.max(0, Math.trunc(qty));
  if (q === 0) return;

  const optLines = await prisma.cloudOptionRecipeLine.findMany({
    where: { storeId, sourceKind: "SUB_OPT", entityCloudId: substituteCloudId },
    select: { ingredientCloudId: true, qtyPerItem: true },
  });
  if (optLines.length > 0) {
    for (const r of optLines) {
      const per = new Decimal(String(r.qtyPerItem));
      addAgg(into, r.ingredientCloudId, per.times(q));
    }
    return;
  }

  const mode = baseType ?? "HOT";
  const sizeCloudId = await resolveMenuSizeCloudId(prisma, storeId, sizeLabel);
  if (!sizeCloudId) return;

  const legacy = await prisma.cloudSubstituteRecipeConsumption.findMany({
    where: { storeId, substituteCloudId, sizeCloudId, mode },
    select: { ingredientCloudId: true, qtyPerItem: true },
  });
  for (const r of legacy) {
    const per = new Decimal(String(r.qtyPerItem));
    addAgg(into, r.ingredientCloudId, per.times(q));
  }
}

async function resolveIncludedShots(
  prisma: PrismaClient,
  storeId: string,
  menuItemCloudId: string,
  baseType: DrinkMode | null,
  sizeLabel: string | null,
  itemDefaultShots: number | null | undefined
): Promise<number> {
  if (!baseType || !sizeLabel?.trim()) {
    return typeof itemDefaultShots === "number" ? Math.max(0, itemDefaultShots) : 0;
  }
  const prices = await prisma.cloudMenuItemSizePrice.findMany({
    where: { storeId, menuItemCloudId, baseType },
    select: { sizeCode: true, includedShots: true },
  });
  const n = sizeLabel.trim().toLowerCase();
  const row = prices.find((p) => p.sizeCode.trim().toLowerCase() === n);
  if (row?.includedShots != null) return Math.max(0, row.includedShots);
  return typeof itemDefaultShots === "number" ? Math.max(0, itemDefaultShots) : 0;
}

async function accumulateExtraShotBeans(
  prisma: PrismaClient,
  storeId: string,
  menuItemCloudId: string,
  baseType: DrinkMode | null,
  sizeLabel: string | null,
  shotsQty: number,
  qtyLine: number,
  into: Agg
) {
  const qLine = Math.max(0, Math.trunc(qtyLine));
  if (qLine === 0 || shotsQty <= 0) return;

  const cloudItem = await prisma.cloudMenuItem.findFirst({
    where: { storeId, cloudId: menuItemCloudId },
    select: { defaultShots: true },
  });
  const included = await resolveIncludedShots(
    prisma,
    storeId,
    menuItemCloudId,
    baseType,
    sizeLabel,
    cloudItem?.defaultShots
  );
  const extraPerUnit = Math.max(0, shotsQty - included);
  if (extraPerUnit === 0) return;

  const rule = await prisma.cloudShotPricingRule.findFirst({
    where: {
      storeId,
      isActive: true,
      extraShotIngredientCloudId: { not: null },
      qtyPerExtraShot: { not: null },
    },
    orderBy: { sortOrder: "asc" },
    select: { extraShotIngredientCloudId: true, qtyPerExtraShot: true },
  });
  if (!rule?.extraShotIngredientCloudId || !rule.qtyPerExtraShot) return;

  const perShot = new Decimal(String(rule.qtyPerExtraShot));
  addAgg(into, rule.extraShotIngredientCloudId, perShot.times(extraPerUnit).times(qLine));
}

export async function computeConsumptionForLine(
  prisma: PrismaClient,
  storeId: string,
  line: LocalLineConsumptionInput,
  effectiveQty: number
): Promise<Agg> {
  const map: Agg = new Map();
  const menuItemId = line.menuItemId?.trim();
  if (!menuItemId) return map;

  const { baseType, sizeLabel, plainOptionIds, substituteCloudId, shotsQty } = parseOptionsJson(
    line.optionsJson ?? null
  );

  await accumulateBaseAndSizeRecipes(prisma, storeId, menuItemId, effectiveQty, baseType, sizeLabel, map);
  await accumulateOptionRecipes(prisma, storeId, plainOptionIds, effectiveQty, map);
  if (substituteCloudId) {
    await accumulateSubstituteRecipes(prisma, storeId, substituteCloudId, effectiveQty, baseType, sizeLabel, map);
  }
  await accumulateExtraShotBeans(
    prisma,
    storeId,
    menuItemId,
    baseType,
    sizeLabel,
    shotsQty,
    effectiveQty,
    map
  );
  return map;
}

export function consumptionMapToPerUnitJson(map: Agg): string {
  const obj: Record<string, string> = {};
  for (const [k, v] of map) {
    if (!v.isZero()) obj[k] = v.toString();
  }
  return JSON.stringify(obj);
}

export function mergeConsumptionMaps(target: Agg, part: Agg) {
  for (const [k, v] of part) {
    addAgg(target, k, v);
  }
}
