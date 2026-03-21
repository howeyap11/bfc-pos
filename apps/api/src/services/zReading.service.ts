import type { PrismaClient } from "@prisma/client";
import { printRawEscPosToReceiptPrinter } from "./print.service";
import { getPrinterConfig } from "./printerConfig.service";
import { getTransactionSummary } from "./transactionSummary.service";
import { getCalendarDayRange } from "./dayRange.service";

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
  refundCount: number;
  refundAmountCents: number;
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

/**
 * @deprecated Use getCalendarDayRange from dayRange.service.ts
 * Kept for backward compatibility; now returns strict calendar day range.
 */
export function getBusinessDayZReadingRange(selectedDate: string | Date): { from: Date; to: Date } {
  return getCalendarDayRange(selectedDate);
}

/**
 * Generate Z-Reading report from the transaction summary (single source of truth).
 * Uses strict calendar day: selected day 12:00 AM to 11:59:59 PM.
 */
export async function generateZReadingReport(
  prisma: PrismaClient,
  selectedDate: string
): Promise<ZReadingReport> {
  const summary = await getTransactionSummary(prisma, selectedDate);
  const printerConfig = await getPrinterConfig();
  const storeConfig = await prisma.storeConfig.findUnique({
    where: { storeId: STORE_ID },
    select: { enabledPaymentMethods: true },
  });

  const paymentTotalsCents: ZReadingPaymentTotals = { ...summary.paymentTotalsCents };
  let enabledMethods: string[] = [];
  try {
    enabledMethods = storeConfig?.enabledPaymentMethods
      ? (JSON.parse(storeConfig.enabledPaymentMethods) as string[]).map(normalizePaymentMethod)
      : [];
  } catch {
    enabledMethods = [];
  }
  const methodOrderSeed = ["CASH", "GCASH", "CARD", "FOODPANDA", "GRAB", "BFCAPP"];
  const methodsToPrint = Array.from(new Set([...methodOrderSeed, ...enabledMethods, ...Object.keys(paymentTotalsCents)]));
  for (const m of methodsToPrint) {
    if (!(m in paymentTotalsCents)) paymentTotalsCents[m] = 0;
  }

  const cashSalesCents = paymentTotalsCents.CASH ?? 0;

  console.log("[Z_READING] from summary", {
    selectedDate,
    from: summary.from.toISOString(),
    to: summary.to.toISOString(),
    transactionCount: summary.transactionCount,
    grossSalesCents: summary.grossSalesCents,
    refundCount: summary.refundCount,
    refundAmountCents: summary.refundAmountCents,
    startReceipt: summary.startReceipt,
    endReceipt: summary.endReceipt,
  });

  const report: ZReadingReport = {
    selectedDate,
    from: summary.from,
    to: summary.to,
    printedAt: new Date(),
    printerName: printerConfig.receiptPrinter,
    totals: {
      grossSalesCents: summary.grossSalesCents,
      cashSalesCents,
      pwdDiscountCents: summary.pwdDiscountCents,
      snrDiscountCents: summary.snrDiscountCents,
      regularDiscountCents: summary.regularDiscountCents,
      vatCents: 0,
      refundCount: summary.refundCount,
      refundAmountCents: summary.refundAmountCents,
      voidedCount: summary.voidedCount,
      voidedAmountCents: summary.voidedAmountCents,
      transactionCount: summary.transactionCount,
      skuCount: summary.skuCount,
      totalQuantity: summary.totalQuantity,
      startReceipt: summary.startReceipt,
      endReceipt: summary.endReceipt,
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
  lines.push(lineKV("Refund Count", String(report.totals.refundCount)));
  lines.push(lineKV("Refund Amount", moneyFromCents(report.totals.refundAmountCents)));
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
