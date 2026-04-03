/**
 * Cloud inventory ledger from synced POS payloads (audit/reporting — not operational truth).
 *
 * **Local-frozen consumption (preferred):** When every menu line (`menuItemId` set) includes
 * `consumptionPerUnitByIngredientJson` (string, including `"{}"` for zero), cloud **does not** call
 * `computeConsumptionForLine` / current recipes. Aggregates use POS-computed maps only.
 *
 * **Legacy fallback:** If any such line is missing that field, cloud recomputes from **current** DB
 * recipes (historical drift possible). Avoid mixed payloads.
 *
 * - PAID: SALE_DEDUCTION (idempotent per sourceType+sourceId = SALE_DEDUCTION + sourceTransactionId)
 * - REFUND: REVERSAL per refund id + line-level qty (idempotent per refund id)
 * - VOID: REVERSAL for net remaining after refunds (idempotent per sourceTransactionId)
 */
import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import type { DrinkMode } from "@prisma/client";
import type { InventoryService } from "./inventory.service.js";

export type SyncedLineItemInput = {
  name: string;
  qty: number;
  lineTotal: number;
  /** POS TransactionLineItem.id — required for refund line matching */
  sourceLineItemId?: string;
  /** Cloud MenuItem.id (same as POS Item.cloudId) */
  menuItemId?: string | null;
  optionsJson?: string | null;
  /** JSON map ingredientId (cloud) -> qty per 1 line item — when present on all menu lines, cloud skips recipe recompute */
  consumptionPerUnitByIngredientJson?: string | null;
};

export type SyncedRefundItemInput = {
  sourceLineItemId: string;
  qtyRefunded: number;
  amountRefundedCents: number;
};

export type SyncedRefundInput = {
  id: string;
  reason: string;
  amountCents: number;
  createdAt: string;
  items?: SyncedRefundItemInput[];
};

function isDrinkMode(v: string): v is DrinkMode {
  return v === "HOT" || v === "ICED" || v === "CONCENTRATED";
}

/** Exported for tests */
export function parseOptionsJson(optionsJson: string | null): {
  baseType: DrinkMode | null;
  sizeLabel: string | null;
  plainOptionIds: string[];
  substituteCloudId: string | null;
} {
  let baseType: DrinkMode | null = null;
  let sizeLabel: string | null = null;
  const plainOptionIds: string[] = [];
  let substituteCloudId: string | null = null;
  if (!optionsJson?.trim()) {
    return { baseType, sizeLabel, plainOptionIds, substituteCloudId };
  }
  let arr: unknown[];
  try {
    arr = JSON.parse(optionsJson) as unknown[];
    if (!Array.isArray(arr)) return { baseType, sizeLabel, plainOptionIds, substituteCloudId };
  } catch {
    return { baseType, sizeLabel, plainOptionIds, substituteCloudId };
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
    if ("id" in o && typeof o.id === "string" && o.id && !o.type) {
      if (o.missing === true) continue;
      const g = typeof o.group === "string" ? o.group.toLowerCase() : "";
      const n = typeof o.name === "string" ? o.name.toLowerCase() : "";
      // Size/temp is handled via RecipeLineSize + { type: "size" }; skip option rows to avoid double count.
      if (g.includes("size")) continue;
      if (g.includes("shot") || n.includes("shot") || n.includes("espresso shot")) continue;
      plainOptionIds.push(o.id);
    }
  }
  return { baseType, sizeLabel, plainOptionIds, substituteCloudId };
}

type Agg = Map<string, Prisma.Decimal>;

function addAgg(map: Agg, ingredientId: string, qty: Prisma.Decimal) {
  if (qty.isZero()) return;
  const cur = map.get(ingredientId);
  map.set(ingredientId, cur ? cur.plus(qty) : qty);
}

async function accumulateBaseAndSizeRecipes(
  prisma: PrismaClient,
  menuItemId: string,
  qty: number,
  baseType: DrinkMode | null,
  sizeLabel: string | null,
  into: Agg
) {
  const q = Math.max(0, Math.trunc(qty));
  if (q === 0) return;

  const [baseRows, sizeRows] = await Promise.all([
    prisma.recipeLine.findMany({
      where: { menuItemId, deletedAt: null },
      select: { ingredientId: true, qtyPerItem: true },
    }),
    prisma.recipeLineSize.findMany({
      where: { menuItemId, deletedAt: null },
      select: { ingredientId: true, qtyPerItem: true, baseType: true, sizeCode: true },
    }),
  ]);

  const labelNorm = sizeLabel?.trim().toLowerCase() ?? "";
  const applicableSize =
    baseType && labelNorm
      ? sizeRows.filter(
          (r) =>
            r.baseType === baseType &&
            (r.sizeCode === sizeLabel?.trim() ||
              r.sizeCode.trim().toLowerCase() === labelNorm)
        )
      : [];

  const rowsToUse =
    applicableSize.length > 0
      ? applicableSize
      : baseRows;

  for (const rec of rowsToUse) {
    const per = new Prisma.Decimal(rec.qtyPerItem);
    addAgg(into, rec.ingredientId, per.times(q));
  }
}

async function resolveMenuSizeId(
  prisma: PrismaClient,
  sizeLabel: string | null
): Promise<string | null> {
  if (!sizeLabel?.trim()) return null;
  const row = await prisma.menuSize.findFirst({
    where: { label: { equals: sizeLabel.trim(), mode: "insensitive" }, isActive: true },
    select: { id: true },
  });
  return row?.id ?? null;
}

async function accumulateOptionRecipes(
  prisma: PrismaClient,
  optionIds: string[],
  qty: number,
  into: Agg
) {
  const q = Math.max(0, Math.trunc(qty));
  if (q === 0 || optionIds.length === 0) return;

  const unique = [...new Set(optionIds)];

  const [choiceLines, addOnOptLines, addOnLines] = await Promise.all([
    prisma.optionChoiceRecipeLine.findMany({
      where: { optionId: { in: unique } },
      select: { optionId: true, ingredientId: true, qtyPerItem: true },
    }),
    prisma.addOnOptionRecipeLine.findMany({
      where: { optionId: { in: unique } },
      select: { optionId: true, ingredientId: true, qtyPerItem: true },
    }),
    prisma.addOnRecipeLine.findMany({
      where: { addOnId: { in: unique } },
      select: { addOnId: true, ingredientId: true, qtyPerItem: true },
    }),
  ]);

  const covered = new Set<string>();
  for (const r of choiceLines) {
    covered.add(r.optionId);
    const per = new Prisma.Decimal(r.qtyPerItem);
    addAgg(into, r.ingredientId, per.times(q));
  }
  for (const r of addOnOptLines) {
    if (covered.has(r.optionId)) continue;
    covered.add(r.optionId);
    const per = new Prisma.Decimal(r.qtyPerItem);
    addAgg(into, r.ingredientId, per.times(q));
  }
  for (const r of addOnLines) {
    if (covered.has(r.addOnId)) continue;
    covered.add(r.addOnId);
    const per = new Prisma.Decimal(r.qtyPerItem);
    addAgg(into, r.ingredientId, per.times(q));
  }
}

async function accumulateSubstituteRecipes(
  prisma: PrismaClient,
  substituteCloudId: string,
  qty: number,
  baseType: DrinkMode | null,
  sizeLabel: string | null,
  into: Agg
) {
  const q = Math.max(0, Math.trunc(qty));
  if (q === 0) return;

  const optLines = await prisma.substituteOptionRecipeLine.findMany({
    where: { optionId: substituteCloudId },
    select: { ingredientId: true, qtyPerItem: true },
  });
  if (optLines.length > 0) {
    for (const r of optLines) {
      const per = new Prisma.Decimal(r.qtyPerItem);
      addAgg(into, r.ingredientId, per.times(q));
    }
    return;
  }

  const mode = baseType ?? "HOT";
  const sizeId = await resolveMenuSizeId(prisma, sizeLabel);
  if (!sizeId) return;

  const legacy = await prisma.substituteRecipeConsumption.findMany({
    where: { substituteId: substituteCloudId, sizeId, mode },
    select: { ingredientId: true, qtyPerItem: true },
  });
  for (const r of legacy) {
    const per = new Prisma.Decimal(r.qtyPerItem);
    addAgg(into, r.ingredientId, per.times(q));
  }
}

export async function computeConsumptionForLine(
  prisma: PrismaClient,
  line: SyncedLineItemInput,
  effectiveQty: number
): Promise<Agg> {
  const map: Agg = new Map();
  if (!line.menuItemId?.trim()) return map;

  const { baseType, sizeLabel, plainOptionIds, substituteCloudId } = parseOptionsJson(
    line.optionsJson ?? null
  );

  await accumulateBaseAndSizeRecipes(
    prisma,
    line.menuItemId,
    effectiveQty,
    baseType,
    sizeLabel,
    map
  );
  await accumulateOptionRecipes(prisma, plainOptionIds, effectiveQty, map);
  if (substituteCloudId) {
    await accumulateSubstituteRecipes(
      prisma,
      substituteCloudId,
      effectiveQty,
      baseType,
      sizeLabel,
      map
    );
  }
  return map;
}

async function mergeMaps(target: Agg, part: Agg) {
  for (const [k, v] of part) {
    addAgg(target, k, v);
  }
}

export async function computeConsumptionForLines(
  prisma: PrismaClient,
  lines: SyncedLineItemInput[],
  qtyForLine: (line: SyncedLineItemInput) => number
): Promise<Agg> {
  const total: Agg = new Map();
  for (const line of lines) {
    const q = Math.max(0, Math.trunc(qtyForLine(line)));
    if (q === 0) continue;
    const part = await computeConsumptionForLine(prisma, line, q);
    await mergeMaps(total, part);
  }
  return total;
}

function aggToDeductions(map: Agg): Array<{ ingredientId: string; quantityBaseUnit: number }> {
  const out: Array<{ ingredientId: string; quantityBaseUnit: number }> = [];
  for (const [ingredientId, d] of map) {
    const n = d.toNumber();
    if (n > 0) out.push({ ingredientId, quantityBaseUnit: n });
  }
  return out;
}

function parseLineItemsJson(json: string | null | undefined): SyncedLineItemInput[] {
  if (!json?.trim()) return [];
  try {
    const arr = JSON.parse(json) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x): x is Record<string, unknown> => x && typeof x === "object" && !Array.isArray(x))
      .map((x) => ({
        name: String(x.name ?? ""),
        qty: Math.max(0, Math.trunc(Number(x.qty) || 0)),
        lineTotal: Math.trunc(Number(x.lineTotal) || 0),
        sourceLineItemId: typeof x.sourceLineItemId === "string" ? x.sourceLineItemId : undefined,
        menuItemId: typeof x.menuItemId === "string" ? x.menuItemId : null,
        optionsJson: typeof x.optionsJson === "string" ? x.optionsJson : null,
        consumptionPerUnitByIngredientJson:
          typeof x.consumptionPerUnitByIngredientJson === "string"
            ? x.consumptionPerUnitByIngredientJson
            : null,
      }));
  } catch {
    return [];
  }
}

function parseRefundsJson(json: string | null | undefined): SyncedRefundInput[] {
  if (!json?.trim()) return [];
  try {
    const arr = JSON.parse(json) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x): x is Record<string, unknown> => x && typeof x === "object" && !Array.isArray(x))
      .map((x) => ({
        id: String(x.id ?? ""),
        reason: String(x.reason ?? ""),
        amountCents: Math.trunc(Number(x.amountCents) || 0),
        createdAt: String(x.createdAt ?? ""),
        items: Array.isArray(x.items)
          ? x.items
              .filter((it): it is Record<string, unknown> => it && typeof it === "object")
              .map((it) => ({
                sourceLineItemId: String(it.sourceLineItemId ?? ""),
                qtyRefunded: Math.max(0, Math.trunc(Number(it.qtyRefunded) || 0)),
                amountRefundedCents: Math.trunc(Number(it.amountRefundedCents) || 0),
              }))
              .filter((it) => it.sourceLineItemId && it.qtyRefunded > 0)
          : undefined,
      }))
      .filter((r) => r.id);
  } catch {
    return [];
  }
}

function buildLineBySourceId(
  lines: SyncedLineItemInput[]
): Map<string, SyncedLineItemInput> {
  const m = new Map<string, SyncedLineItemInput>();
  for (const l of lines) {
    if (l.sourceLineItemId) m.set(l.sourceLineItemId, l);
  }
  return m;
}

/**
 * True only when every menu-attached line carries a string consumption map from POS (offline truth).
 * Lines without `menuItemId` (fees, etc.) are ignored. Partial frozen data is rejected → full cloud recompute.
 */
function usesFrozenLineConsumption(lines: SyncedLineItemInput[]): boolean {
  const menuLines = lines.filter((l) => l.menuItemId?.trim());
  if (menuLines.length === 0) return false;
  return menuLines.every((l) => typeof l.consumptionPerUnitByIngredientJson === "string");
}

function parsePerUnitConsumptionMap(json: string): Map<string, Prisma.Decimal> {
  const m = new Map<string, Prisma.Decimal>();
  try {
    const o = JSON.parse(json) as Record<string, unknown>;
    if (!o || typeof o !== "object") return m;
    for (const [k, v] of Object.entries(o)) {
      m.set(k, new Prisma.Decimal(String(v)));
    }
  } catch {
    return m;
  }
  return m;
}

function aggregateSaleFromFrozenLines(lines: SyncedLineItemInput[]): Agg {
  const total: Agg = new Map();
  for (const line of lines) {
    if (!line.menuItemId?.trim()) continue;
    const raw = line.consumptionPerUnitByIngredientJson;
    if (typeof raw !== "string") continue;
    const q = Math.max(0, Math.trunc(line.qty));
    if (q === 0) continue;
    const perUnit = parsePerUnitConsumptionMap(raw);
    for (const [ingId, per] of perUnit) {
      addAgg(total, ingId, per.times(q));
    }
  }
  return total;
}

function computeRefundConsumptionFromFrozen(
  allLines: SyncedLineItemInput[],
  refund: SyncedRefundInput
): Agg {
  const total: Agg = new Map();
  const byId = buildLineBySourceId(allLines);
  const items = refund.items ?? [];
  if (items.length === 0) return total;

  for (const ri of items) {
    const base = byId.get(ri.sourceLineItemId);
    if (!base?.menuItemId?.trim()) continue;
    const raw = base.consumptionPerUnitByIngredientJson;
    if (typeof raw !== "string") continue;
    const q = Math.max(0, Math.trunc(ri.qtyRefunded));
    if (q === 0) continue;
    const perUnit = parsePerUnitConsumptionMap(raw);
    for (const [ingId, per] of perUnit) {
      addAgg(total, ingId, per.times(q));
    }
  }
  return total;
}

async function computeRefundConsumption(
  prisma: PrismaClient,
  allLines: SyncedLineItemInput[],
  refund: SyncedRefundInput
): Promise<Agg> {
  const total: Agg = new Map();
  const byId = buildLineBySourceId(allLines);
  const items = refund.items ?? [];
  if (items.length === 0) return total;

  for (const ri of items) {
    const base = byId.get(ri.sourceLineItemId);
    if (!base) continue;
    const part = await computeConsumptionForLine(prisma, base, ri.qtyRefunded);
    await mergeMaps(total, part);
  }
  return total;
}

function subtractAgg(sale: Agg, refunded: Agg): Agg {
  const out: Agg = new Map();
  for (const [ing, s] of sale) {
    const r = refunded.get(ing) ?? new Prisma.Decimal(0);
    const net = s.minus(r);
    if (net.gt(0)) out.set(ing, net);
  }
  return out;
}

export async function applyInventoryFromSyncedTransactionRow(params: {
  prisma: PrismaClient;
  inventory: InventoryService;
  sourceTransactionId: string;
  status: string;
  isTest: boolean;
  lineItemsSummaryJson: string | null;
  refundsJson: string | null;
  log: {
    warn: (o: object, msg?: string) => void;
    info: (o: object, msg?: string) => void;
    error: (o: object, msg?: string) => void;
  };
}): Promise<void> {
  const { prisma, inventory, sourceTransactionId, status, isTest, lineItemsSummaryJson, refundsJson, log } =
    params;

  if (isTest) return;

  const location = await prisma.inventoryLocation.findFirst({
    where: { isActive: true, locationType: "STORE" },
    orderBy: { sortOrder: "asc" },
    select: { id: true },
  });
  if (!location) {
    log.warn({ sourceTransactionId }, "[SyncInventory] No active STORE inventory location; skip ledger effects");
    return;
  }
  const locationId = location.id;

  const lines = parseLineItemsJson(lineItemsSummaryJson);
  const refunds = parseRefundsJson(refundsJson);

  const saleSourceId = sourceTransactionId;

  /** Includes zero-qty SALE_DEDUCTION anchor rows (see InventoryService.postSaleDeductions) so refund/void are not skipped after zero-recipe frozen sales. */
  async function hasSaleDeductionRows(): Promise<boolean> {
    const n = await prisma.stockMovement.count({
      where: { sourceType: "SALE_DEDUCTION", sourceId: saleSourceId },
    });
    return n > 0;
  }

  const frozen = usesFrozenLineConsumption(lines);
  const menuLinesForFrozenCheck = lines.filter((l) => l.menuItemId?.trim());
  const partialFrozenPayload =
    menuLinesForFrozenCheck.length > 0 &&
    menuLinesForFrozenCheck.some((l) => typeof l.consumptionPerUnitByIngredientJson === "string") &&
    !menuLinesForFrozenCheck.every((l) => typeof l.consumptionPerUnitByIngredientJson === "string");
  if (partialFrozenPayload) {
    log.warn(
      {
        sourceTransactionId,
        status,
        menuLineCount: menuLinesForFrozenCheck.length,
      },
      "[SyncInventory] Partial frozen consumption on menu lines — using CLOUD_RECOMPUTE for entire sale (POS should send maps on all menu lines)"
    );
  }
  if (lines.some((l) => l.menuItemId?.trim())) {
    log.info(
      {
        sourceTransactionId,
        status,
        inventorySource: frozen ? "LOCAL_FROZEN" : "CLOUD_RECOMPUTE",
        menuLineCount: lines.filter((l) => l.menuItemId?.trim()).length,
      },
      "[SyncInventory] Consumption source for synced transaction"
    );
  }

  if (status === "PAID") {
    const saleAgg = frozen
      ? aggregateSaleFromFrozenLines(lines)
      : await computeConsumptionForLines(prisma, lines, (l) => l.qty);
    const deductions = aggToDeductions(saleAgg);
    try {
      await inventory.postSaleDeductions({
        locationId,
        sourceId: saleSourceId,
        deductions,
      });
    } catch (err) {
      log.error({ err, sourceTransactionId }, "[SyncInventory] postSaleDeductions failed");
      throw err;
    }
    if (deductions.length === 0 && menuLinesForFrozenCheck.length > 0) {
      log.info(
        { sourceTransactionId, frozen },
        "[SyncInventory] PAID tx: zero deduction rows; SALE_DEDUCTION anchor recorded if applicable"
      );
    }
  }

  for (const r of refunds) {
    const refundSourceType = "REFUND_REVERSAL";
    const refundSourceId = r.id;
    if (!r.items?.length) {
      log.warn(
        { sourceTransactionId, refundId: r.id },
        "[SyncInventory] Refund has no line items in sync payload; skip inventory reversal (needs items[])"
      );
      continue;
    }
    const saleLedger = await hasSaleDeductionRows();
    const allowRefundInventory = saleLedger || frozen;
    if (!allowRefundInventory) {
      log.warn(
        { sourceTransactionId, refundId: r.id, frozen, saleLedger },
        "[SyncInventory] Skip refund reversal: no SALE_DEDUCTION anchor and not fully frozen — cannot trust POS restore amounts"
      );
      continue;
    }
    const refAgg = frozen
      ? computeRefundConsumptionFromFrozen(lines, r)
      : await computeRefundConsumption(prisma, lines, r);
    const restores = aggToDeductions(refAgg);
    if (restores.length > 0) {
      try {
        await inventory.postIdempotentPositiveMovements({
          locationId,
          sourceType: refundSourceType,
          sourceId: refundSourceId,
          movementType: "REVERSAL",
          lines: restores,
        });
      } catch (err) {
        log.error({ err, sourceTransactionId, refundId: r.id }, "[SyncInventory] refund reversal failed");
        throw err;
      }
    } else {
      log.info(
        { sourceTransactionId, refundId: r.id, frozen, restoreLineCount: restores.length },
        "[SyncInventory] Refund reversal: zero restore qty; writing anchor if missing"
      );
      try {
        await inventory.postIdempotentLedgerAnchorForZeroLines({
          locationId,
          sourceType: refundSourceType,
          sourceId: refundSourceId,
          movementType: "REVERSAL",
          notes: "REFUND_REVERSAL anchor (zero qty)",
        });
      } catch (err) {
        log.error({ err, sourceTransactionId, refundId: r.id }, "[SyncInventory] refund reversal anchor failed");
        throw err;
      }
    }
  }

  const isVoid = status === "VOID";
  if (isVoid) {
    const voidSourceType = "VOID_REVERSAL";
    const voidSourceId = sourceTransactionId;

    const saleLedger = await hasSaleDeductionRows();
    const allowVoidInventory = saleLedger || frozen;
    if (!allowVoidInventory) {
      log.warn(
        { sourceTransactionId, frozen, saleLedger },
        "[SyncInventory] Skip void reversal: no SALE_DEDUCTION anchor and not fully frozen"
      );
      return;
    }

    const saleAgg = frozen
      ? aggregateSaleFromFrozenLines(lines)
      : await computeConsumptionForLines(prisma, lines, (l) => l.qty);
    let refundedTotal: Agg = new Map();
    for (const rf of refunds) {
      if (!rf.items?.length) continue;
      const part = frozen
        ? computeRefundConsumptionFromFrozen(lines, rf)
        : await computeRefundConsumption(prisma, lines, rf);
      await mergeMaps(refundedTotal, part);
    }
    const remaining = subtractAgg(saleAgg, refundedTotal);
    const voidRestores = aggToDeductions(remaining);
    if (voidRestores.length > 0) {
      try {
        await inventory.postIdempotentPositiveMovements({
          locationId,
          sourceType: voidSourceType,
          sourceId: voidSourceId,
          movementType: "REVERSAL",
          lines: voidRestores,
        });
      } catch (err) {
        log.error({ err, sourceTransactionId }, "[SyncInventory] void reversal failed");
        throw err;
      }
    } else {
      log.info(
        { sourceTransactionId, frozen, voidRestoreLineCount: voidRestores.length },
        "[SyncInventory] Void reversal: zero net restore; writing anchor if missing"
      );
      try {
        await inventory.postIdempotentLedgerAnchorForZeroLines({
          locationId,
          sourceType: voidSourceType,
          sourceId: voidSourceId,
          movementType: "REVERSAL",
          notes: "VOID_REVERSAL anchor (zero qty)",
        });
      } catch (err) {
        log.error({ err, sourceTransactionId }, "[SyncInventory] void reversal anchor failed");
        throw err;
      }
    }
  }
}
