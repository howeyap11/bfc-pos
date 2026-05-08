import type { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";
import {
  computeConsumptionForLine,
  consumptionMapToPerUnitJson,
  parseOptionsJson,
} from "./localConsumption.service.js";

const REF_SALE = "POS_CLOUD_SALE";
const REF_REFUND = "POS_CLOUD_REFUND";
const REF_VOID = "POS_CLOUD_VOID";

function parsePerUnitJson(json: string | null | undefined): Map<string, Decimal> {
  const m = new Map<string, Decimal>();
  if (json == null || !String(json).trim()) return m;
  try {
    const o = JSON.parse(json) as Record<string, unknown>;
    if (!o || typeof o !== "object") return m;
    for (const [k, v] of Object.entries(o)) {
      m.set(k, new Decimal(String(v)));
    }
  } catch {
    return m;
  }
  return m;
}

export type LineConsumptionSource = {
  consumptionPerUnitByIngredientJson: string | null;
  menuItemCloudId: string | null;
  optionsJson?: string | null;
};

/** Prefer frozen per-line JSON; if missing, match finalize path via local recipe recompute (legacy / unfinalized lines). */
async function addConsumptionToRestoreMap(
  prisma: PrismaClient,
  storeId: string,
  line: LineConsumptionSource,
  qty: number,
  into: Map<string, Decimal>
): Promise<void> {
  const q = Math.max(0, Math.trunc(qty));
  if (q <= 0 || !line.menuItemCloudId?.trim()) return;
  const json = line.consumptionPerUnitByIngredientJson?.trim();
  if (json) {
    const per = parsePerUnitJson(json);
    for (const [ing, amt] of per) {
      if (amt.isZero()) continue;
      const add = amt.times(q);
      const cur = into.get(ing);
      into.set(ing, cur ? cur.plus(add) : add);
    }
    return;
  }
  const map = await computeConsumptionForLine(
    prisma,
    storeId,
    { menuItemId: line.menuItemCloudId, optionsJson: line.optionsJson ?? null },
    q
  );
  for (const [ing, amt] of map) {
    if (amt.isZero()) continue;
    const cur = into.get(ing);
    into.set(ing, cur ? cur.plus(amt) : amt);
  }
}

async function aggregateSaleTotalsAsync(
  prisma: PrismaClient,
  storeId: string,
  menuLines: Array<{
    qty: number;
    consumptionPerUnitByIngredientJson: string | null;
    menuItemCloudId: string | null;
    optionsJson?: string | null;
  }>
): Promise<Map<string, Decimal>> {
  const total = new Map<string, Decimal>();
  for (const li of menuLines) {
    await addConsumptionToRestoreMap(
      prisma,
      storeId,
      {
        consumptionPerUnitByIngredientJson: li.consumptionPerUnitByIngredientJson,
        menuItemCloudId: li.menuItemCloudId,
        optionsJson: li.optionsJson,
      },
      li.qty,
      total
    );
  }
  return total;
}

/**
 * Persist per-unit consumption JSON on each line and post CONSUMPTION movements (idempotent per transaction).
 * Ledger keys: refType POS_CLOUD_SALE + refId = local Transaction.id (see InventoryService.applyPosCloudSaleDeductions).
 */
export async function finalizePaidTransactionInventory(params: {
  prisma: PrismaClient;
  storeId: string;
  transactionId: string;
  lineItems: Array<{
    id: string;
    qty: number;
    optionsJson: string | null;
    item: { cloudId: string | null } | null;
  }>;
  createdByStaffId?: string;
  inventoryWarn?: (meta: Record<string, unknown>, msg: string) => void;
  inventory: {
    applyPosCloudSaleDeductions: (p: {
      storeId: string;
      transactionId: string;
      consumptionByCloudIngredient: Map<string, Decimal>;
      createdByStaffId?: string;
      inventoryWarn?: (meta: Record<string, unknown>, msg: string) => void;
    }) => Promise<void>;
  };
}): Promise<void> {
  const { prisma, storeId, transactionId, lineItems, createdByStaffId, inventory, inventoryWarn } = params;

  const saleLines = lineItems.filter((l) => l.item?.cloudId);
  if (saleLines.length === 0) return;

  const ledgerDone = await prisma.inventoryMovement.findFirst({
    where: { storeId, refType: REF_SALE, refId: transactionId },
    select: { id: true },
  });

  const totalConsumption = new Map<string, Decimal>();

  for (const li of saleLines) {
    const menuItemId = li.item!.cloudId!;
    if (!ledgerDone) {
      const map = await computeConsumptionForLine(
        prisma,
        storeId,
        { menuItemId, optionsJson: li.optionsJson },
        1
      );
      const json = consumptionMapToPerUnitJson(map);
      await prisma.transactionLineItem.update({
        where: { id: li.id },
        data: { consumptionPerUnitByIngredientJson: json },
      });
      const q = Math.max(0, Math.trunc(li.qty));
      if (q > 0) {
        for (const [k, v] of map) {
          const add = v.times(q);
          const cur = totalConsumption.get(k);
          totalConsumption.set(k, cur ? cur.plus(add) : add);
        }
      }
    } else {
      const q = Math.max(0, Math.trunc(li.qty));
      if (q <= 0) continue;
      const existing = await prisma.transactionLineItem.findUnique({
        where: { id: li.id },
        select: { consumptionPerUnitByIngredientJson: true },
      });
      const per = parsePerUnitJson(existing?.consumptionPerUnitByIngredientJson ?? null);
      for (const [k, v] of per) {
        const add = v.times(q);
        const cur = totalConsumption.get(k);
        totalConsumption.set(k, cur ? cur.plus(add) : add);
      }
    }
  }

  await inventory.applyPosCloudSaleDeductions({
    storeId,
    transactionId,
    consumptionByCloudIngredient: totalConsumption,
    createdByStaffId,
    inventoryWarn,
  });
}

export async function restoreInventoryForRefund(params: {
  prisma: PrismaClient;
  storeId: string;
  refundId: string;
  refundItems: Array<{ transactionLineItemId: string; qtyRefunded: number }>;
  lineById: Map<string, LineConsumptionSource>;
  createdByStaffId?: string;
  inventoryWarn?: (meta: Record<string, unknown>, msg: string) => void;
  inventory: {
    applyPosCloudRefundRestore: (p: {
      storeId: string;
      refundId: string;
      restoreByCloudIngredient: Map<string, Decimal>;
      createdByStaffId?: string;
      inventoryWarn?: (meta: Record<string, unknown>, msg: string) => void;
    }) => Promise<void>;
  };
}): Promise<void> {
  const { prisma, storeId, refundId, refundItems, lineById, createdByStaffId, inventory, inventoryWarn } = params;
  const restore = new Map<string, Decimal>();
  for (const ri of refundItems) {
    const line = lineById.get(ri.transactionLineItemId);
    if (!line?.menuItemCloudId) continue;
    const q = Math.max(0, Math.trunc(ri.qtyRefunded));
    if (q === 0) continue;
    await addConsumptionToRestoreMap(prisma, storeId, line, q, restore);
  }
  await inventory.applyPosCloudRefundRestore({
    storeId,
    refundId,
    restoreByCloudIngredient: restore,
    createdByStaffId,
    inventoryWarn,
  });
}

export async function restoreInventoryForVoid(params: {
  prisma: PrismaClient;
  storeId: string;
  transactionId: string;
  lineItems: Array<{
    id: string;
    qty: number;
    optionsJson?: string | null;
    consumptionPerUnitByIngredientJson: string | null;
    item: { cloudId: string | null } | null;
  }>;
  refunds: Array<{ refundItems: Array<{ transactionLineItemId: string; qtyRefunded: number }> }>;
  createdByStaffId?: string;
  inventoryWarn?: (meta: Record<string, unknown>, msg: string) => void;
  inventory: {
    applyPosCloudVoidRestore: (p: {
      storeId: string;
      transactionId: string;
      restoreByCloudIngredient: Map<string, Decimal>;
      createdByStaffId?: string;
      inventoryWarn?: (meta: Record<string, unknown>, msg: string) => void;
    }) => Promise<void>;
  };
}): Promise<void> {
  const { prisma, transactionId, lineItems, refunds, createdByStaffId, inventory, storeId, inventoryWarn } = params;

  const menuLines = lineItems.filter((l) => l.item?.cloudId);
  const saleTotal = await aggregateSaleTotalsAsync(
    prisma,
    storeId,
    menuLines.map((l) => ({
      qty: l.qty,
      consumptionPerUnitByIngredientJson: l.consumptionPerUnitByIngredientJson,
      menuItemCloudId: l.item?.cloudId ?? null,
      optionsJson: l.optionsJson,
    }))
  );

  let refunded = new Map<string, Decimal>();
  const lineById = new Map(
    menuLines.map((l) => [
      l.id,
      {
        consumptionPerUnitByIngredientJson: l.consumptionPerUnitByIngredientJson,
        menuItemCloudId: l.item?.cloudId ?? null,
        optionsJson: l.optionsJson,
      } satisfies LineConsumptionSource,
    ])
  );
  for (const r of refunds) {
    for (const ri of r.refundItems) {
      const line = lineById.get(ri.transactionLineItemId);
      if (!line?.menuItemCloudId) continue;
      const q = Math.max(0, Math.trunc(ri.qtyRefunded));
      if (q === 0) continue;
      await addConsumptionToRestoreMap(prisma, storeId, line, q, refunded);
    }
  }

  const net = new Map<string, Decimal>();
  for (const [ing, s] of saleTotal) {
    const r = refunded.get(ing) ?? new Decimal(0);
    const n = s.minus(r);
    if (n.gt(0)) net.set(ing, n);
  }

  await inventory.applyPosCloudVoidRestore({
    storeId,
    transactionId,
    restoreByCloudIngredient: net,
    createdByStaffId,
    inventoryWarn,
  });
}

export { REF_SALE, REF_REFUND, REF_VOID, parseOptionsJson };
