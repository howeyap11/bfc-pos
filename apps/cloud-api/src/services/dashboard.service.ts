/**
 * Dashboard aggregation service for Cloud Admin.
 * Uses PAID transactions only for sales metrics. No sync contract changes.
 *
 * Net sales: each synced row keeps original totalCents; refundAmountCents is reconciled
 * separately on sync (see POS transactionSync). Net = max(0, totalCents - refundAmountCents)
 * per transaction, matching apps/api transactionSummary aggregation.
 */

import type { PrismaClient } from "@prisma/client";
import { localBusinessDateRangeToUtc, getBusinessTzOffsetHours } from "../lib/businessDay.js";

const DEFAULT_STORE_ID = "store_1";

/** Net earned per synced PAID row after refunds (totalCents is not reduced on refund in sync payload). */
export function netSalesCentsForSyncedTransaction(
  totalCents: number,
  refundAmountCents: number | null | undefined
): number {
  return Math.max(0, totalCents - (refundAmountCents ?? 0));
}

export type DateRange = { start: Date; end: Date };

/** Re-export for backwards compatibility. Uses Asia/Manila for business-day boundaries. */
export const buildDateRange = localBusinessDateRangeToUtc;

/** Parse synced payment lines; coerce amountCents to int (avoids string JSON corrupting sums). */
export function parsePaymentLinesJson(paymentsJson: string): { method: string; amountCents: number }[] {
  try {
    const raw = JSON.parse(paymentsJson) as unknown;
    if (!Array.isArray(raw)) return [];
    const out: { method: string; amountCents: number }[] = [];
    for (const x of raw) {
      if (!x || typeof x !== "object") continue;
      const o = x as Record<string, unknown>;
      const method = typeof o.method === "string" ? o.method : "UNKNOWN";
      const n = Number(o.amountCents);
      const amountCents = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
      out.push({ method, amountCents });
    }
    return out;
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
export function normalizePaymentMethod(method: string): string {
  const u = (method || "CASH").toUpperCase().replace(/\s+/g, "");
  if (["CASH", "CARD", "GCASH", "FOODPANDA"].includes(u)) return u;
  return "Other";
}

/**
 * Split each transaction's net sales across payment lines proportionally so bucket totals
 * match KPI net sales (handles refunds + split payments without double-counting full totals).
 */
export function allocatePaymentLinesToNetCents(
  payments: { method: string; amountCents: number }[],
  netCents: number
): { method: string; amountCents: number }[] {
  if (netCents <= 0) return [];
  const safe = payments.map((p) => ({
    method: p.method,
    amountCents: Math.max(0, Math.trunc(Number(p.amountCents) || 0)),
  }));
  const sum = safe.reduce((s, p) => s + p.amountCents, 0);
  if (sum <= 0) return [];
  let allocated = 0;
  const out: { method: string; amountCents: number }[] = [];
  for (let i = 0; i < safe.length; i++) {
    const p = safe[i];
    const isLast = i === safe.length - 1;
    const share = isLast ? netCents - allocated : Math.round((p.amountCents / sum) * netCents);
    const v = Math.max(0, Math.min(share, netCents - allocated));
    out.push({ method: p.method, amountCents: v });
    allocated += v;
  }
  return out;
}

/**
 * Per-tx net sales allocated across payment methods (same rules as dashboard donut).
 * Sum of bucket cents equals sum of net sales for the provided rows (when every tx with net>0 has parsable payment lines).
 */
export function foldPaymentsFromSyncedTransactions(
  txs: Array<{
    paymentsJson: string;
    totalCents: number;
    refundAmountCents: number | null | undefined;
  }>
): { byMethod: Record<string, number> } {
  const byMethod: Record<string, number> = {};
  for (const t of txs) {
    const net = netSalesCentsForSyncedTransaction(t.totalCents, t.refundAmountCents);
    const payments = parsePaymentLinesJson(t.paymentsJson);
    const allocated = allocatePaymentLinesToNetCents(payments, net);
    for (const p of allocated) {
      const m = normalizePaymentMethod(p.method);
      byMethod[m] = (byMethod[m] ?? 0) + p.amountCents;
    }
  }
  return { byMethod };
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
    where: { storeId, status: "PAID", createdAt: { gte: range.start, lt: range.end } },
    select: {
      totalCents: true,
      discountCents: true,
      itemsCount: true,
      source: true,
      refundAmountCents: true,
    },
  });

  let totalNetSalesCents = 0;
  let totalDiscountsCents = 0;
  let itemsCount = 0;
  let totalOnlineOrdersCount = 0;
  let totalRefundsCents = 0;

  for (const t of txs) {
    totalNetSalesCents += netSalesCentsForSyncedTransaction(t.totalCents, t.refundAmountCents);
    totalDiscountsCents += t.discountCents;
    itemsCount += t.itemsCount;
    totalRefundsCents += t.refundAmountCents ?? 0;
    if (t.source && String(t.source).toUpperCase() !== "POS") totalOnlineOrdersCount += 1;
  }
  // TODO: COGS not in SyncedTransaction/line items; add when recipe/COGS sync exists.
  const costOfGoodsCents = 0;
  const profitCents = totalNetSalesCents - costOfGoodsCents;

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

/** Ensure every calendar day from startDate to endDate (inclusive) has a bucket. */
function fillDailyBuckets(buckets: Map<string, number>, startDate: string, endDate: string): void {
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [ey, em, ed] = endDate.split("-").map(Number);
  const curr = new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0, 0));
  const end = new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59, 999));
  while (curr.getTime() <= end.getTime()) {
    const key = `${curr.getUTCFullYear()}-${String(curr.getUTCMonth() + 1).padStart(2, "0")}-${String(curr.getUTCDate()).padStart(2, "0")}`;
    if (!buckets.has(key)) buckets.set(key, 0);
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
}

/** Ensure every month from startDate to endDate (inclusive) has a bucket. */
function fillMonthlyBuckets(buckets: Map<string, number>, startDate: string, endDate: string): void {
  const [sy, sm] = startDate.split("-").map(Number);
  const [ey, em] = endDate.split("-").map(Number);
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    if (!buckets.has(key)) buckets.set(key, 0);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
}

export async function getSalesByDate(
  prisma: PrismaClient,
  storeId: string,
  range: DateRange,
  granularity: "hourly" | "daily" | "monthly",
  options?: { startDate: string; endDate: string }
): Promise<SalesByDateBucket[]> {
  const txs = await prisma.syncedTransaction.findMany({
    where: { storeId, status: "PAID", createdAt: { gte: range.start, lt: range.end } },
    select: { createdAt: true, totalCents: true, refundAmountCents: true },
  });

  const offsetHours = getBusinessTzOffsetHours();
  const buckets = new Map<string, number>();
  for (const t of txs) {
    const d = new Date(t.createdAt);
    let key: string;
    if (granularity === "hourly") {
      key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}T${String(d.getUTCHours()).padStart(2, "0")}:00`;
    } else if (granularity === "daily") {
      const local = new Date(d.getTime() + offsetHours * 60 * 60 * 1000);
      key = `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}-${String(local.getUTCDate()).padStart(2, "0")}`;
    } else {
      const local = new Date(d.getTime() + offsetHours * 60 * 60 * 1000);
      key = `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}`;
    }
    const net = netSalesCentsForSyncedTransaction(t.totalCents, t.refundAmountCents);
    buckets.set(key, (buckets.get(key) ?? 0) + net);
  }

  if (granularity === "daily" && options?.startDate && options?.endDate) {
    fillDailyBuckets(buckets, options.startDate, options.endDate);
  } else if (granularity === "monthly" && options?.startDate && options?.endDate) {
    fillMonthlyBuckets(buckets, options.startDate, options.endDate);
  }

  const sorted = Array.from(buckets.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return sorted.map(([key, amountCents]) => ({
    label: formatBucketLabel(key, granularity),
    date: toIsoUtc(key, granularity),
    amountCents,
  }));
}

/** Return an ISO UTC string for the bucket so the frontend can parse and format in local time. */
function toIsoUtc(key: string, granularity: string): string {
  if (granularity === "hourly") {
    return `${key}:00.000Z`;
  }
  if (granularity === "daily") {
    return `${key}T12:00:00.000Z`;
  }
  const [y, m] = key.split("-").map(Number);
  return `${y}-${String(m).padStart(2, "0")}-01T12:00:00.000Z`;
}

/** Format bucket key (UTC) for server-side fallback; frontend should prefer formatting from date (ISO UTC). */
function formatBucketLabel(key: string, granularity: string): string {
  if (granularity === "hourly") {
    const [datePart, timePart] = key.split("T");
    const [y, m, d] = datePart.split("-").map(Number);
    const hour = timePart ? parseInt(timePart.slice(0, 2), 10) : 0;
    const d2 = new Date(Date.UTC(y, m - 1, d, hour));
    return d2.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" });
  }
  if (granularity === "daily") {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  }
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1)).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export async function getPaymentTypeTotals(
  prisma: PrismaClient,
  storeId: string,
  range: DateRange
): Promise<PaymentTypeTotal[]> {
  const txs = await prisma.syncedTransaction.findMany({
    where: { storeId, status: "PAID", createdAt: { gte: range.start, lt: range.end } },
    select: { paymentsJson: true, totalCents: true, refundAmountCents: true },
  });

  const { byMethod } = foldPaymentsFromSyncedTransactions(txs);

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
      where: { storeId, status: "PAID", createdAt: { gte: range.start, lt: range.end } },
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
    where: { storeId, status: "PAID", createdAt: { gte: range.start, lt: range.end } },
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
    where: { storeId, status: "PAID", createdAt: { gte: range.start, lt: range.end } },
    select: { cashierName: true, totalCents: true, refundAmountCents: true },
  });

  const byCashier: Record<string, number> = {};
  for (const t of txs) {
    const name = (t.cashierName || "Unassigned").trim();
    const net = netSalesCentsForSyncedTransaction(t.totalCents, t.refundAmountCents);
    byCashier[name] = (byCashier[name] ?? 0) + net;
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
      where: { storeId, status: "PAID", createdAt: { gte: range.start, lt: range.end } },
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

// buildDateRange and getDefaultDateRange are re-exported from lib/businessDay.ts
export { getDefaultDateRange } from "../lib/businessDay.js";
