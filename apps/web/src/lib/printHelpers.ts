/**
 * Receipt and sticker print helpers.
 * Use transaction from GET /api/pos/transactions/:id/receipt (source of truth).
 */

import { extractSizeTemp, formatSizeTempLine } from "./lineItemDisplay";
import { shouldPrintSticker, getStickerLineLabel } from "./sticker";

export type ReceiptLineItem = {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  note?: string | null;
  optionsJson?: string | null;
  categoryCloudId?: string | null;
};

export type ReceiptTransaction = {
  id: string;
  transactionNo: number;
  totalCents: number;
  subtotalCents?: number;
  discountCents?: number;
  createdAt: string;
  lineItems: ReceiptLineItem[];
  payments: Array<{ method: string; amountCents: number; status?: string }>;
};

function formatPesos(cents: number): string {
  return `₱${(cents / 100).toFixed(2)}`;
}

/** Minimal line-like shape for display (receipt, register summary, transactions list). */
export type LineItemDisplayInput = {
  optionsJson?: string | null;
  baseType?: string | null;
  sizeLabel?: string | null;
};

/** Parse item for display: size/temp from either shape, then optionsJson for milk, shots, add-ons. Exported for reuse (e.g. register summary). */
export function lineItemDisplayParts(item: LineItemDisplayInput): {
  primary: string;
  secondary: string[];
} {
  const primary = formatSizeTempLine(extractSizeTemp(item));
  const secondary: string[] = [];
  if (!item.optionsJson) return { primary, secondary };
  try {
    const opts = JSON.parse(item.optionsJson) as Array<{
      type?: string;
      choice?: string;
      qty?: number;
      name?: string;
      group?: string;
    }>;
    for (const o of opts) {
      if (o.type === "size") {
        // already in primary via extractSizeTemp
      } else if (o.type === "milk" && o.choice) {
        const label =
          o.choice === "OAT" ? "Oat milk" : o.choice === "SOY" ? "Soy milk" : o.choice === "ALMOND" ? "Almond milk" : "Full cream";
        secondary.push(label);
      } else if (o.type === "shots" && o.qty != null) {
        secondary.push(`${o.qty} shot${o.qty !== 1 ? "s" : ""}`);
      } else if (!o.type && o.name) {
        secondary.push(o.name);
      }
    }
  } catch {
    // ignore
  }
  return { primary, secondary };
}

export function buildReceiptHtml(tx: ReceiptTransaction): string {
  const paymentMethod = tx.payments[0]?.method ?? "CASH";
  const lines = tx.lineItems
    .map((item) => {
      const { primary, secondary } = lineItemDisplayParts(item);
      const mods = [primary, ...secondary].filter(Boolean).join(" · ");
      return `
        <tr>
          <td style="padding:4px 8px;border-bottom:1px solid #eee">${item.qty}× ${item.name}${mods ? ` (${mods})` : ""}</td>
          <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${formatPesos(item.lineTotal)}</td>
        </tr>`;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt #${tx.transactionNo}</title>
  <style>
    body { font-family: monospace; font-size: 12px; max-width: 320px; margin: 12px; }
    table { width: 100%; border-collapse: collapse; }
    .total { font-weight: bold; font-size: 14px; margin-top: 8px; }
    .method { margin-top: 4px; color: #555; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <div style="text-align:center;margin-bottom:8px"><strong>RECEIPT #${tx.transactionNo}</strong></div>
  <div style="font-size:10px;color:#666;margin-bottom:8px">${new Date(tx.createdAt).toLocaleString()}</div>
  <table>
    ${lines}
  </table>
  <div class="total">Total: ${formatPesos(tx.totalCents)}</div>
  <div class="method">Payment: ${paymentMethod}</div>
</body>
</html>`;
}

/**
 * Write receipt HTML into an already-opened window and trigger print.
 * Use this after opening the window synchronously in a click handler, then fetching data.
 */
export function writeReceiptAndPrint(printWindow: Window, tx: ReceiptTransaction): void {
  if (printWindow.closed) return;
  const html = buildReceiptHtml(tx);
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

/** Open window, write receipt, print. Use when data is already available (e.g. transaction-success page). */
export function printReceipt(tx: ReceiptTransaction): void {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Please allow pop-ups to print receipt.");
    return;
  }
  writeReceiptAndPrint(w, tx);
}

/** Sticker filter options: when stickerPrintCategoryIds is set, lines in those categories or with size/temp print. */
export type StickerPrintOptions = { stickerPrintCategoryIds?: string[] | null };

/** Build HTML for sticker sheet: one label per line that should print (category or size/temp). Pass stickerPrintCategoryIds from store config. */
export function buildStickerHtml(tx: ReceiptTransaction, opts?: StickerPrintOptions): string {
  const ids = opts?.stickerPrintCategoryIds ?? [];
  const lineItems = tx.lineItems.filter((line) => shouldPrintSticker(line, ids));
  if (lineItems.length === 0) return "";

  const labels = lineItems
    .map((line) => {
      const label = getStickerLineLabel(line);
      const lines = label.split("\n");
      return `
        <div class="sticker" style="border:1px solid #ccc;padding:8px 12px;margin:8px;min-height:48px;font-size:14px;line-height:1.3">
          ${lines.map((l) => `<div>${escapeHtml(l)}</div>`).join("")}
        </div>`;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Stickers #${tx.transactionNo}</title>
  <style>
    body { font-family: sans-serif; font-size: 14px; margin: 12px; }
    .sticker { break-inside: avoid; }
    @media print { .sticker { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <div style="margin-bottom:8px;font-weight:bold">Order #${tx.transactionNo}</div>
  ${labels}
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Write sticker HTML into an already-opened window and trigger print.
 * Returns false if no sticker items (caller should close window and show message).
 * Pass stickerPrintCategoryIds from store config for category-based sticker printing.
 */
export function writeStickerAndPrint(
  printWindow: Window,
  tx: ReceiptTransaction,
  opts?: StickerPrintOptions
): boolean {
  const ids = opts?.stickerPrintCategoryIds ?? [];
  const lineItems = tx.lineItems.filter((line) => shouldPrintSticker(line, ids));
  if (lineItems.length === 0) return false;
  if (printWindow.closed) return true;
  const html = buildStickerHtml(tx, opts);
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
  return true;
}

/** Open window, write stickers, print. Pass stickerPrintCategoryIds from store config for category-based printing. */
export function printSticker(tx: ReceiptTransaction, opts?: StickerPrintOptions): boolean {
  const ids = opts?.stickerPrintCategoryIds ?? [];
  const lineItems = tx.lineItems.filter((line) => shouldPrintSticker(line, ids));
  if (lineItems.length === 0) return false;
  const w = window.open("", "_blank");
  if (!w) {
    alert("Please allow pop-ups to print stickers.");
    return false;
  }
  return writeStickerAndPrint(w, tx, opts);
}
