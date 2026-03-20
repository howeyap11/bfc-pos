/**
 * Transaction summary for the Transactions UI panel.
 * Uses the same business-day range as Z-reading. Aggregation is decoupled from pagination.
 */
import type { PrismaClient } from "@prisma/client";
import { getBusinessDayZReadingRange } from "./zReading.service";
import { formatTransactionLineLabel } from "./print.service";

const STORE_ID = "store_1";

export type TransactionSummaryCategory = {
  name: string;
  qty: number;
  amountCents: number;
};

export type TransactionSummaryEjournalRow = {
  id: string;
  label: string;
  categoryName: string | null;
  cashier: string;
  qty: number;
  amountCents: number;
};

export type TransactionSummary = {
  selectedDate: string;
  from: Date;
  to: Date;
  dateLabel: string;
  grossSalesCents: number;
  transactionCount: number;
  skuCount: number;
  totalQuantity: number;
  categories: TransactionSummaryCategory[];
  salesByCashier: Record<string, number>;
  cashiers: string[];
  ejournalRows: TransactionSummaryEjournalRow[];
  ejournalTotalQty: number;
  ejournalTotalAmountCents: number;
  paymentTotalsCents: Record<string, number>;
  pwdDiscountCents: number;
  snrDiscountCents: number;
  regularDiscountCents: number;
  voidedCount: number;
  voidedAmountCents: number;
};

export async function getTransactionSummary(
  prisma: PrismaClient,
  selectedDate: string
): Promise<TransactionSummary> {
  const { from, to } = getBusinessDayZReadingRange(selectedDate);

  const txs = await prisma.transaction.findMany({
    where: {
      storeId: STORE_ID,
      createdAt: { gte: from, lt: to },
    },
    include: {
      lineItems: {
        include: {
          refundItems: true,
          item: {
            select: {
              category: { select: { id: true, name: true } },
            },
          },
        },
      },
      payments: true,
    },
    orderBy: { transactionNo: "asc" },
  });

  const paidTxs = txs.filter((tx) => tx.status === "PAID");
  const voidedTxs = txs.filter((tx) => tx.status === "VOID");

  const categoriesMap = new Map<string, { name: string; qty: number; amountCents: number }>();
  const salesByCashier: Record<string, number> = {};
  const ejournalRows: TransactionSummaryEjournalRow[] = [];
  const paymentTotalsCents: Record<string, number> = {};

  let grossSalesCents = 0;
  let transactionCount = 0;
  let skuCount = 0;
  let totalQuantity = 0;
  let ejournalTotalQty = 0;
  let ejournalTotalAmountCents = 0;
  let pwdDiscountCents = 0;
  let snrDiscountCents = 0;
  let regularDiscountCents = 0;

  const normalizePaymentMethod = (m: string) => {
    const s = String(m ?? "").trim().toUpperCase();
    if (s === "GCASH_MANUAL") return "GCASH";
    if (s === "GRABFOOD") return "GRAB";
    return s || "OTHER";
  };

  const classifyDiscountTag = (tag: string | null | undefined): "PWD" | "SNR" | "REGULAR" => {
    const t = String(tag ?? "").trim().toLowerCase();
    if (t === "pwd") return "PWD";
    if (t === "snr" || t === "senior" || t === "senior citizen" || t === "sc") return "SNR";
    return "REGULAR";
  };

  for (const tx of paidTxs) {
    const refundedCents = tx.lineItems.reduce(
      (sum, li) => sum + li.refundItems.reduce((s, ri) => s + ri.amountRefundedCents, 0),
      0
    );
    const netSales = Math.max(0, tx.totalCents - refundedCents);
    grossSalesCents += netSales;
    transactionCount += 1;

    const cashier = tx.createdBy || "Unknown";
    salesByCashier[cashier] = (salesByCashier[cashier] ?? 0) + netSales;

    regularDiscountCents += Math.max(0, tx.discountCents ?? 0);

    for (const p of tx.payments) {
      if (p.status !== "PAID") continue;
      const method = normalizePaymentMethod(p.method);
      paymentTotalsCents[method] = (paymentTotalsCents[method] ?? 0) + p.amountCents;
    }

    for (const li of tx.lineItems) {
      const refundedQty = li.refundItems.reduce((sum, ri) => sum + ri.qtyRefunded, 0);
      const refundedAmount = li.refundItems.reduce((sum, ri) => sum + ri.amountRefundedCents, 0);
      const netQty = Math.max(0, li.qty - refundedQty);
      const netAmount = Math.max(0, li.lineTotal - refundedAmount);
      if (netQty <= 0 && netAmount <= 0) continue;

      skuCount += 1;
      totalQuantity += netQty;

      const categoryName = li.categoryName ?? li.item?.category?.name ?? null;
      const catKey = categoryName?.trim() ? categoryName.trim() : "Uncategorized";
      const existing = categoriesMap.get(catKey) ?? { name: catKey, qty: 0, amountCents: 0 };
      existing.qty += netQty;
      existing.amountCents += netAmount;
      categoriesMap.set(catKey, existing);

      const displayLabel = formatTransactionLineLabel({
        name: li.name,
        optionsJson: li.optionsJson,
        categoryName: categoryName ?? undefined,
        subCategoryName: li.subCategoryName ?? undefined,
        qty: netQty,
        includeQuantity: true,
      });

      ejournalRows.push({
        id: `${tx.id}-${li.id}`,
        label: displayLabel,
        categoryName,
        cashier,
        qty: netQty,
        amountCents: netAmount,
      });
      ejournalTotalQty += netQty;
      ejournalTotalAmountCents += netAmount;

      if (refundedQty > 0) continue;
      if (!li.optionsJson) continue;
      try {
        const opts = JSON.parse(li.optionsJson) as Array<{ type?: string; amountCents?: number; tag?: string | null }>;
        for (const o of opts) {
          if (o.type !== "discount" || (o.amountCents ?? 0) <= 0) continue;
          const amount = Math.max(0, Math.trunc(o.amountCents ?? 0));
          const kind = classifyDiscountTag(o.tag);
          if (kind === "PWD") pwdDiscountCents += amount;
          else if (kind === "SNR") snrDiscountCents += amount;
          else regularDiscountCents += amount;
        }
      } catch {
        /* ignore */
      }
    }
  }

  const categories = Array.from(categoriesMap.values()).sort((a, b) => b.amountCents - a.amountCents);
  const cashiers = Object.keys(salesByCashier).sort();
  const voidedCount = voidedTxs.length;
  const voidedAmountCents = voidedTxs.reduce((sum, tx) => sum + tx.totalCents, 0);

  const dateLabel = from.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return {
    selectedDate,
    from,
    to,
    dateLabel,
    grossSalesCents,
    transactionCount,
    skuCount,
    totalQuantity,
    categories,
    salesByCashier,
    cashiers,
    ejournalRows,
    ejournalTotalQty,
    ejournalTotalAmountCents,
    paymentTotalsCents,
    pwdDiscountCents,
    snrDiscountCents,
    regularDiscountCents,
    voidedCount,
    voidedAmountCents,
  };
}
