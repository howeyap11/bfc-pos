import type { PrismaClient } from "@prisma/client";
import { printRawEscPosToReceiptPrinter } from "./print.service";
import { getPrinterConfig } from "./printerConfig.service";

const RECEIPT_WIDTH = 48;
const STORE_ID = "store_1";

type ZReadingPaymentTotals = Record<string, number>;

export type ZReadingTotals = {
  grossSalesCents: number;
  cashSalesCents: number;
  pwdDiscountCents: number;
  snrDiscountCents: number;
  regularDiscountCents: number;
  vatCents: number;
  voidedCount: number;
  voidedAmountCents: number;
  transactionCount: number;
  skuCount: number;
  totalQuantity: number;
  startReceipt: number | null;
  endReceipt: number | null;
  paymentTotalsCents: ZReadingPaymentTotals;
};

export type ZReadingReport = {
  selectedDate: string;
  from: Date;
  to: Date;
  printedAt: Date;
  printerName: string;
  totals: ZReadingTotals;
};

function padRight(s: string, width: number): string {
  return s.length >= width ? s.slice(0, width) : s + " ".repeat(width - s.length);
}

function moneyFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function lineKV(label: string, value: string): string {
  const left = `${label}:`;
  const right = value;
  const gap = Math.max(1, RECEIPT_WIDTH - left.length - right.length);
  return `${left}${" ".repeat(gap)}${right}`;
}

function fmtDateTimeLocal(d: Date): string {
  return d.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function normalizePaymentMethod(method: string): string {
  const m = String(method || "").trim().toUpperCase();
  if (!m) return "OTHER";
  if (m === "GCASH_MANUAL") return "GCASH";
  if (m === "GRABFOOD") return "GRAB";
  return m;
}

function paymentLabel(method: string): string {
  const map: Record<string, string> = {
    CASH: "Cash Sales",
    CARD: "Card",
    GCASH: "GCash",
    FOODPANDA: "Foodpanda",
    GRAB: "Grab",
    GRABFOOD: "Grab",
    BFCAPP: "BFCApp",
  };
  return map[method] ?? method;
}

/** Map discount tag from optionsJson to PWD | SNR | REGULAR. Handles senior/sc/senior citizen variants. */
function classifyDiscountTag(tag: string | null | undefined): "PWD" | "SNR" | "REGULAR" {
  const t = String(tag ?? "").trim().toLowerCase();
  if (t === "pwd") return "PWD";
  if (t === "snr" || t === "senior" || t === "senior citizen" || t === "sc") return "SNR";
  return "REGULAR";
}

export function getBusinessDayZReadingRange(selectedDate: string | Date): { from: Date; to: Date } {
  const base = selectedDate instanceof Date ? new Date(selectedDate) : new Date(`${selectedDate}T00:00:00`);
  const from = new Date(base);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  to.setHours(1, 0, 0, 0);
  return { from, to };
}

export async function generateZReadingReport(
  prisma: PrismaClient,
  selectedDate: string
): Promise<ZReadingReport> {
  const { from, to } = getBusinessDayZReadingRange(selectedDate);
  const printerConfig = await getPrinterConfig();
  const storeConfig = await prisma.storeConfig.findUnique({
    where: { storeId: STORE_ID },
    select: { enabledPaymentMethods: true },
  });

  const txs = await prisma.transaction.findMany({
    where: {
      storeId: STORE_ID,
      createdAt: { gte: from, lt: to },
    },
    include: {
      lineItems: { include: { refundItems: true } },
      payments: true,
    },
    orderBy: { transactionNo: "asc" },
  });

  const paidTxs = txs.filter((tx) => tx.status === "PAID");
  const voidedTxs = txs.filter((tx) => tx.status === "VOID");

  let grossSalesCents = 0;
  let pwdDiscountCents = 0;
  let snrDiscountCents = 0;
  let regularDiscountCents = 0;
  let transactionCount = 0;
  let skuCount = 0;
  let totalQuantity = 0;
  let startReceipt: number | null = null;
  let endReceipt: number | null = null;
  const paymentTotalsCents: ZReadingPaymentTotals = {};
  const discountSourceLog: Array<{ txNo: number; lineName: string; tag: string | null; amountCents: number; kind: "PWD" | "SNR" | "REGULAR" }> = [];

  for (const tx of paidTxs) {
    const refundedCents = tx.lineItems.reduce(
      (sum, li) => sum + li.refundItems.reduce((inner, ri) => inner + ri.amountRefundedCents, 0),
      0
    );
    const netSales = Math.max(0, tx.totalCents - refundedCents);
    grossSalesCents += netSales;
    regularDiscountCents += Math.max(0, tx.discountCents ?? 0);
    transactionCount += 1;

    if (startReceipt == null || tx.transactionNo < startReceipt) startReceipt = tx.transactionNo;
    if (endReceipt == null || tx.transactionNo > endReceipt) endReceipt = tx.transactionNo;

    for (const li of tx.lineItems) {
      const refundedQty = li.refundItems.reduce((sum, ri) => sum + ri.qtyRefunded, 0);
      const netQty = Math.max(0, li.qty - refundedQty);
      if (netQty > 0) {
        skuCount += 1;
        totalQuantity += netQty;
      }

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
          discountSourceLog.push({ txNo: tx.transactionNo, lineName: li.name, tag: o.tag ?? null, amountCents: amount, kind });
        }
      } catch {
        // ignore malformed optionsJson
      }
    }

    for (const p of tx.payments) {
      if (p.status !== "PAID") continue;
      const method = normalizePaymentMethod(p.method);
      paymentTotalsCents[method] = (paymentTotalsCents[method] ?? 0) + p.amountCents;
    }
  }

  let enabledMethods: string[] = [];
  try {
    enabledMethods = storeConfig?.enabledPaymentMethods
      ? (JSON.parse(storeConfig.enabledPaymentMethods) as string[]).map(normalizePaymentMethod)
      : [];
  } catch {
    enabledMethods = [];
  }
  const presentMethods = Object.keys(paymentTotalsCents);
  const methodOrderSeed = ["CASH", "GCASH", "CARD", "FOODPANDA", "GRAB", "BFCAPP"];
  const methodsToPrint = Array.from(new Set([...methodOrderSeed, ...enabledMethods, ...presentMethods]));
  for (const m of methodsToPrint) {
    if (!(m in paymentTotalsCents)) paymentTotalsCents[m] = 0;
  }

  const cashSalesCents = paymentTotalsCents.CASH ?? 0;
  const voidedAmountCents = voidedTxs.reduce((sum, tx) => sum + tx.totalCents, 0);
  const voidedCount = voidedTxs.length;

  console.log("[Z_READING] discount breakdown", {
    pwdDiscountTotal: pwdDiscountCents,
    snrDiscountTotal: snrDiscountCents,
    regularDiscountTotal: regularDiscountCents,
    discountSourceCount: discountSourceLog.length,
    rawDiscountSources: discountSourceLog.slice(0, 20),
  });

  const report: ZReadingReport = {
    selectedDate,
    from,
    to,
    printedAt: new Date(),
    printerName: printerConfig.receiptPrinter,
    totals: {
      grossSalesCents,
      cashSalesCents,
      pwdDiscountCents,
      snrDiscountCents,
      regularDiscountCents,
      vatCents: 0,
      voidedCount,
      voidedAmountCents,
      transactionCount,
      skuCount,
      totalQuantity,
      startReceipt,
      endReceipt,
      paymentTotalsCents,
    },
  };

  return report;
}

export function formatZReadingReceipt(report: ZReadingReport): Buffer {
  const ESC = "\x1b";
  const GS = "\x1d";
  const INIT = ESC + "@";
  const LF = "\x0a";
  const FULL_CUT = GS + "V\x00";
  const sep = "-".repeat(RECEIPT_WIDTH);

  const lines: string[] = [];
  lines.push(padRight("Z-READING", RECEIPT_WIDTH));
  lines.push(lineKV("Printed", fmtDateTimeLocal(report.printedAt)));
  lines.push(lineKV("For", fmtDateTimeLocal(report.from)));
  lines.push(lineKV("To", fmtDateTimeLocal(report.to)));
  lines.push(sep);
  lines.push(lineKV("Gross Sales", moneyFromCents(report.totals.grossSalesCents)));
  lines.push(lineKV("Cash Sales", moneyFromCents(report.totals.cashSalesCents)));

  for (const method of Object.keys(report.totals.paymentTotalsCents)) {
    if (method === "CASH") continue;
    lines.push(lineKV(paymentLabel(method), moneyFromCents(report.totals.paymentTotalsCents[method] ?? 0)));
  }

  lines.push(sep);
  lines.push(lineKV("PWD Discount", moneyFromCents(report.totals.pwdDiscountCents)));
  lines.push(lineKV("SNR Discount", moneyFromCents(report.totals.snrDiscountCents)));
  lines.push(lineKV("Regular Discount", moneyFromCents(report.totals.regularDiscountCents)));
  lines.push(lineKV("VAT", moneyFromCents(report.totals.vatCents)));
  lines.push(lineKV("Voided Tx", String(report.totals.voidedCount)));
  lines.push(lineKV("Voided Amount", moneyFromCents(report.totals.voidedAmountCents)));
  lines.push(sep);
  lines.push(lineKV("Start Receipt", report.totals.startReceipt != null ? String(report.totals.startReceipt).padStart(6, "0") : "N/A"));
  lines.push(lineKV("End Receipt", report.totals.endReceipt != null ? String(report.totals.endReceipt).padStart(6, "0") : "N/A"));
  lines.push(sep);
  lines.push(lineKV("No. Transactions", String(report.totals.transactionCount)));
  lines.push(lineKV("No. of SKUs", String(report.totals.skuCount)));
  lines.push(lineKV("Total Quantity", String(report.totals.totalQuantity)));
  lines.push("");
  lines.push("");

  return Buffer.from(INIT + lines.join(LF) + LF + LF + FULL_CUT, "utf8");
}

export async function printZReading(prisma: PrismaClient, selectedDate: string): Promise<ZReadingReport> {
  const report = await generateZReadingReport(prisma, selectedDate);
  const payload = formatZReadingReceipt(report);
  await printRawEscPosToReceiptPrinter(payload);
  return report;
}
