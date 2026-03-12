/**
 * Dashboard aggregation service for Cloud Admin.
 * Uses PAID transactions only for sales metrics. No sync contract changes.
 */

import type { PrismaClient } from "@prisma/client";

const DEFAULT_STORE_ID = "store_1";

type DateRange = { start: Date; end: Date };

function parsePayments(paymentsJson: string): { method: string; amountCents: number }[] {
  try {
    return JSON.parse(paymentsJson) as { method: string; amountCents: number }[];
  } catch {
    return [];
  }
}

function parseLineItems(lineItemsSummaryJson: string | null): { name: string; qty: number; lineTotal: number }[] {
  if (!lineItemsSummaryJson) return [];
  try {
    return JSON.parse(lineItemsSummaryJson) as { name: string; qty: number; lineTotal: number }[];
  } catch {
    return [];
  }
}

/** Normalize payment method for display (match POS enums). Others grouped as Other. */
function normalizePaymentMethod(method: string): string {
  const u = (method || "CASH").toUpperCase().replace(/\s+/g, "");
  if (["CASH", "CARD", "GCASH", "FOODPANDA"].includes(u)) return u;
  return "Other";
}

export type DashboardKpis = {
  totalNetSalesCents: number;
  transactionCount: number;
  itemsCount: number;
  totalRefundsCents: number;
  totalDiscountsCents: number;
  costOfGoodsCents: number;
  profitCents: number;
  totalOnlineOrdersCount: number;
};

export type SalesByDateBucket = { label: string; date: string; amountCents: number };

export type PaymentTypeTotal = { method: string; amountCents: number; percentage?: number };

export type SalesByCategoryRow = { category: string; amountCents: number };
export type SalesByItemRow = { item: string; amountCents: number };
export type SalesByCashierRow = { cashier: string; amountCents: number };
export type SalesByPaymentRow = { method: string; amountCents: number };

export type ItemsSoldRow = {
  rank: number;
  subCategory: string;
  item: string;
  qty: number;
  amountCents: number;
  profitCents: number;
};

export async function getDashboardKpis(
  prisma: PrismaClient,
  storeId: string,
  range: DateRange
): Promise<DashboardKpis> {
  const txs = await prisma.syncedTransaction.findMany({
    where: { storeId, status: "PAID", createdAt: { gte: range.start, lte: range.end } },
    select: {
      totalCents: true,
      discountCents: true,
      itemsCount: true,
      source: true,
    },
  });

  let totalNetSalesCents = 0;
  let totalDiscountsCents = 0;
  let itemsCount = 0;
  let totalOnlineOrdersCount = 0;

  for (const t of txs) {
    totalNetSalesCents += t.totalCents;
    totalDiscountsCents += t.discountCents;
    itemsCount += t.itemsCount;
    if (t.source && String(t.source).toUpperCase() !== "POS") totalOnlineOrdersCount += 1;
  }

  // TODO: Refunds not in schema; add when POS supports refund amount sync.
  const totalRefundsCents = 0;
  // TODO: COGS not in SyncedTransaction/line items; add when recipe/COGS sync exists.
  const costOfGoodsCents = 0;
  const profitCents = totalNetSalesCents - totalRefundsCents - costOfGoodsCents;

  return {
    totalNetSalesCents,
    transactionCount: txs.length,
    itemsCount,
    totalRefundsCents,
    totalDiscountsCents,
    costOfGoodsCents,
    profitCents,
    totalOnlineOrdersCount,
  };
}

export async function getSalesByDate(
  prisma: PrismaClient,
  storeId: string,
  range: DateRange,
  granularity: "hourly" | "daily" | "monthly"
): Promise<SalesByDateBucket[]> {
  const txs = await prisma.syncedTransaction.findMany({
    where: { storeId, status: "PAID", createdAt: { gte: range.start, lte: range.end } },
    select: { createdAt: true, totalCents: true },
  });

  const buckets = new Map<string, number>();
  for (const t of txs) {
    const d = new Date(t.createdAt);
    let key: string;
    if (granularity === "hourly") {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:00`;
    } else if (granularity === "daily") {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }
    buckets.set(key, (buckets.get(key) ?? 0) + t.totalCents);
  }

  const sorted = Array.from(buckets.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return sorted.map(([label, amountCents]) => ({
    label: formatBucketLabel(label, granularity),
    date: label,
    amountCents,
  }));
}

function formatBucketLabel(key: string, granularity: string): string {
  if (granularity === "hourly") {
    const [datePart, timePart] = key.split("T");
    const [y, m, d] = datePart.split("-").map(Number);
    const hour = timePart ? parseInt(timePart.slice(0, 2), 10) : 0;
    const d2 = new Date(y, m - 1, d, hour);
    return d2.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }
  if (granularity === "daily") {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export async function getPaymentTypeTotals(
  prisma: PrismaClient,
  storeId: string,
  range: DateRange
): Promise<PaymentTypeTotal[]> {
  const txs = await prisma.syncedTransaction.findMany({
    where: { storeId, status: "PAID", createdAt: { gte: range.start, lte: range.end } },
    select: { paymentsJson: true },
  });

  const byMethod: Record<string, number> = {};
  for (const t of txs) {
    const payments = parsePayments(t.paymentsJson);
    for (const p of payments) {
      const m = normalizePaymentMethod(p.method);
      byMethod[m] = (byMethod[m] ?? 0) + p.amountCents;
    }
  }

  const total = Object.values(byMethod).reduce((s, v) => s + v, 0);
  const displayOrder = ["CASH", "CARD", "GCASH", "FOODPANDA", "Other"];
  const normalizedLabels: Record<string, string> = {
    CASH: "Cash",
    CARD: "Card",
    GCASH: "GCash",
    FOODPANDA: "FoodPanda",
    Other: "Other",
  };
  const result: PaymentTypeTotal[] = [];
  for (const key of displayOrder) {
    const amountCents = byMethod[key] ?? 0;
    if (amountCents > 0)
      result.push({
        method: normalizedLabels[key] ?? key,
        amountCents,
        percentage: total > 0 ? Math.round((amountCents / total) * 100) : 0,
      });
  }
  if (result.length === 0)
    result.push({ method: "Cash", amountCents: 0, percentage: 0 });
  return result;
}

export async function getSalesByCategory(
  prisma: PrismaClient,
  storeId: string,
  range: DateRange
): Promise<SalesByCategoryRow[]> {
  const [txs, menuItems] = await Promise.all([
    prisma.syncedTransaction.findMany({
      where: { storeId, status: "PAID", createdAt: { gte: range.start, lte: range.end } },
      select: { lineItemsSummaryJson: true },
    }),
    prisma.menuItem.findMany({
      where: { deletedAt: null },
      select: { name: true, categoryId: true, category: { select: { name: true } } },
    }),
  ]);

  const nameToCategory = new Map<string, string>();
  for (const m of menuItems) {
    const cat = m.category?.name ?? "Uncategorized";
    nameToCategory.set(m.name.trim().toLowerCase(), cat);
  }

  const byCategory: Record<string, number> = {};
  for (const t of txs) {
    const lines = parseLineItems(t.lineItemsSummaryJson);
    for (const line of lines) {
      const key = line.name.trim().toLowerCase();
      const cat = nameToCategory.get(key) ?? "Uncategorized";
      byCategory[cat] = (byCategory[cat] ?? 0) + line.lineTotal;
    }
  }

  return Object.entries(byCategory)
    .map(([category, amountCents]) => ({ category, amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents);
}

export async function getSalesByItem(
  prisma: PrismaClient,
  storeId: string,
  range: DateRange,
  topN = 20
): Promise<SalesByItemRow[]> {
  const txs = await prisma.syncedTransaction.findMany({
    where: { storeId, status: "PAID", createdAt: { gte: range.start, lte: range.end } },
    select: { lineItemsSummaryJson: true },
  });

  const byItem: Record<string, number> = {};
  for (const t of txs) {
    const lines = parseLineItems(t.lineItemsSummaryJson);
    for (const line of lines) {
      const name = line.name.trim() || "Unknown";
      byItem[name] = (byItem[name] ?? 0) + line.lineTotal;
    }
  }

  const sorted = Object.entries(byItem)
    .map(([item, amountCents]) => ({ item, amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents);
  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN);
  if (rest.length > 0) {
    const othersCents = rest.reduce((s, r) => s + r.amountCents, 0);
    top.push({ item: "Others", amountCents: othersCents });
  }
  return top;
}

export async function getSalesByCashier(
  prisma: PrismaClient,
  storeId: string,
  range: DateRange
): Promise<SalesByCashierRow[]> {
  const txs = await prisma.syncedTransaction.findMany({
    where: { storeId, status: "PAID", createdAt: { gte: range.start, lte: range.end } },
    select: { cashierName: true, totalCents: true },
  });

  const byCashier: Record<string, number> = {};
  for (const t of txs) {
    const name = (t.cashierName || "Unassigned").trim();
    byCashier[name] = (byCashier[name] ?? 0) + t.totalCents;
  }

  return Object.entries(byCashier)
    .map(([cashier, amountCents]) => ({ cashier, amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents);
}

export async function getSalesByPayment(
  prisma: PrismaClient,
  storeId: string,
  range: DateRange
): Promise<SalesByPaymentRow[]> {
  const rows = await getPaymentTypeTotals(prisma, storeId, range);
  return rows.map((r) => ({ method: r.method, amountCents: r.amountCents }));
}

export async function getItemsSold(
  prisma: PrismaClient,
  storeId: string,
  range: DateRange,
  options: { sortBy: "qty" | "amount" | "profit"; order: "asc" | "desc"; page: number; pageSize: number }
): Promise<{ rows: ItemsSoldRow[]; total: number }> {
  const [txs, menuItems] = await Promise.all([
    prisma.syncedTransaction.findMany({
      where: { storeId, status: "PAID", createdAt: { gte: range.start, lte: range.end } },
      select: { lineItemsSummaryJson: true },
    }),
    prisma.menuItem.findMany({
      where: { deletedAt: null },
      select: { name: true, subCategoryId: true, subCategory: { select: { name: true } } },
    }),
  ]);

  const nameToSubCategory = new Map<string, string>();
  for (const m of menuItems) {
    const sub = m.subCategory?.name ?? "Other";
    nameToSubCategory.set(m.name.trim().toLowerCase(), sub);
  }

  type Agg = { subCategory: string; item: string; qty: number; amountCents: number; profitCents: number };
  const aggMap = new Map<string, Agg>();

  for (const t of txs) {
    const lines = parseLineItems(t.lineItemsSummaryJson);
    for (const line of lines) {
      const itemName = line.name.trim() || "Unknown";
      const key = itemName.toLowerCase();
      const subCategory = nameToSubCategory.get(key) ?? "Other";
      const existing = aggMap.get(key);
      const amountCents = line.lineTotal;
      // TODO: Profit not materialized; no COGS per line. Use 0 until recipe/COGS sync.
      const profitCents = 0;
      if (existing) {
        existing.qty += line.qty;
        existing.amountCents += amountCents;
        existing.profitCents += profitCents;
      } else {
        aggMap.set(key, {
          subCategory,
          item: itemName,
          qty: line.qty,
          amountCents,
          profitCents,
        });
      }
    }
  }

  let rows = Array.from(aggMap.values());
  const sortKey = options.sortBy === "amount" ? "amountCents" : options.sortBy === "qty" ? "qty" : "profitCents";
  rows.sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    return options.order === "desc" ? bVal - aVal : aVal - bVal;
  });

  const total = rows.length;
  const start = (options.page - 1) * options.pageSize;
  rows = rows.slice(start, start + options.pageSize);

  const result: ItemsSoldRow[] = rows.map((r, i) => ({
    rank: start + i + 1,
    subCategory: r.subCategory,
    item: r.item,
    qty: r.qty,
    amountCents: r.amountCents,
    profitCents: r.profitCents,
  }));

  return { rows: result, total };
}

/** Last synced: prefer latest transaction createdAt in range, else latest Device lastSeenAt. */
export async function getLastSyncedAt(
  prisma: PrismaClient,
  storeId: string
): Promise<Date | null> {
  const [latestTx, latestDevice] = await Promise.all([
    prisma.syncedTransaction.findFirst({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.device.findFirst({
      where: { storeId },
      orderBy: { lastSeenAt: "desc" },
      select: { lastSeenAt: true },
    }),
  ]);

  const txAt = latestTx?.createdAt ?? null;
  const deviceAt = latestDevice?.lastSeenAt ?? null;
  if (!txAt && !deviceAt) return null;
  if (!txAt) return deviceAt;
  if (!deviceAt) return txAt;
  return txAt > deviceAt ? txAt : deviceAt;
}

/** Store name: TODO when business details backend exists; use env or fallback. */
export function getStoreName(): string {
  return process.env.STORE_NAME || process.env.BUSINESS_NAME || "Store";
}

/** Build date range using local timezone (12:00am to 11:59pm). */
export function buildDateRange(startDate: string, endDate: string): DateRange {
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [ey, em, ed] = endDate.split("-").map(Number);
  const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
  const end = new Date(ey, em - 1, ed, 23, 59, 59, 999);
  return { start, end };
}

/** Default date filter: today in local timezone. */
export function getDefaultDateRange(): { startDate: string; endDate: string } {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  const date = `${y}-${m}-${d}`;
  return { startDate: date, endDate: date };
}
