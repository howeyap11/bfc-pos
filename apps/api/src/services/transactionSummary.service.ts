/**
 * Transaction summary for the Transactions UI panel.
 * Uses strict calendar day range (00:00–23:59:59). Single source of truth for day aggregation.
 * Z-Reading consumes this summary. Aggregation is decoupled from pagination.
 *
 * Refund rule: Refunds are linked to the original transaction. We report by transaction
 * sale date (createdAt). Refunded amounts reduce gross sales for that transaction.
 * Refunds processed on a different day still reduce the original sale's net.
 */
import type { PrismaClient } from "@prisma/client";
import { getCalendarDayRange } from "./dayRange.service";
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
  refundCount: number;
  refundAmountCents: number;
  voidedCount: number;
  voidedAmountCents: number;
  startReceipt: number | null;
  endReceipt: number | null;
};

export async function getTransactionSummary(
  prisma: PrismaClient,
  selectedDate: string
): Promise<TransactionSummary> {
  const { from, to, toExclusive } = getCalendarDayRange(selectedDate);

  const txs = await prisma.transaction.findMany({
    where: {
      storeId: STORE_ID,
      createdAt: { gte: from, lt: toExclusive },
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
      refunds: true,
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
  let refundCount = 0;
  let refundAmountCents = 0;
  let startReceipt: number | null = null;
  let endReceipt: number | null = null;

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
    if (refundedCents > 0) {
      refundCount += (tx as { refunds?: { id: string }[] }).refunds?.length ?? 0;
      refundAmountCents += refundedCents;
    }
    const netSales = Math.max(0, tx.totalCents - refundedCents);
    grossSalesCents += netSales;
    transactionCount += 1;

    if (startReceipt == null || tx.transactionNo < startReceipt) startReceipt = tx.transactionNo;
    if (endReceipt == null || tx.transactionNo > endReceipt) endReceipt = tx.transactionNo;

    const cashier = tx.createdBy || "Unknown";
    salesByCashier[cashier] = (salesByCashier[cashier] ?? 0) + netSales;

    regularDiscountCents += Math.max(0, tx.discountCents ?? 0);

    const totalCollected = tx.payments
      .filter((p) => p.status === "PAID")
      .reduce((s, p) => s + p.amountCents, 0);
    for (const p of tx.payments) {
      if (p.status !== "PAID") continue;
      const method = normalizePaymentMethod(p.method);
      const netPaymentCents =
        totalCollected > 0 && refundedCents > 0
          ? Math.round((p.amountCents * netSales) / totalCollected)
          : p.amountCents;
      paymentTotalsCents[method] = (paymentTotalsCents[method] ?? 0) + netPaymentCents;
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

  console.log("[TransactionSummary]", {
    selectedDate,
    from: from.toISOString(),
    to: to.toISOString(),
    totalTransactionsLoaded: txs.length,
    refundRecordsTotal: refundCount,
    refundAmountCents,
    grossSalesCents,
    transactionCount,
    voidedCount,
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
    refundCount,
    refundAmountCents,
    voidedCount,
    voidedAmountCents,
    startReceipt,
    endReceipt,
  };
}
