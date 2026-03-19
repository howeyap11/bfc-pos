/**
 * Direct local receipt (ESC/POS) and sticker (TSPL) printing using Windows printer names.
 * Uses @woovi/node-printer printDirect (RAW). Receipt: ESC/POS for thermal; sticker: TSPL for label printer (e.g. XP360B).
 * Config from printer-config.json via getPrinterConfig().
 * Lazy-loads the native driver so the API can start when the addon is missing; print calls then fail with a clear error.
 */

import { createRequire } from "module";
import { getPrinterConfig } from "./printerConfig.service";

const require = createRequire(import.meta.url);

const PRINTER_DRIVER_UNAVAILABLE =
  "Printer driver not available (native addon missing). From repo root run: pnpm approve-builds, select @woovi/node-printer, then pnpm install.";

const RAW_UNSUPPORTED_HINT =
  " The selected printer driver may not support raw (ESC/POS) printing. Try selecting your receipt printer's manufacturer driver in Settings (e.g. VOZYG80), or use a printer that supports RAW.";

function getPrinterDriver(): { printDirect: (opts: {
  data: Buffer;
  printer: string;
  docname?: string;
  type?: string;
  success?: (jobId: unknown) => void;
  error?: (err: Error) => void;
}) => void } {
  try {
    return require("@woovi/node-printer");
  } catch {
    throw new Error(PRINTER_DRIVER_UNAVAILABLE);
  }
}

function isLikelyRawUnsupported(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("printer error") ||
    lower.includes("1804") ||
    (lower.includes("datatype") && lower.includes("invalid")) ||
    lower.includes("something wrong in printdirect")
  );
}

// ESC/POS
const ESC = "\x1b";
const GS = "\x1d";
const INIT = ESC + "@";
const LF = "\x0a";
const FULL_CUT = GS + "V\x00";

/** Raw ESC/POS QR code bytes (model 2). moduleSize 1..16, ecLevel 48(L)|49(M)|50(Q)|51(H). */
function escPosQrBytes(data: string, moduleSize = 6, ecLevel = 48): Buffer {
  const store = Buffer.from(data, "utf8");
  const bytes: number[] = [];
  const ms = Math.max(1, Math.min(16, moduleSize));
  const ecl = Math.max(48, Math.min(51, ecLevel));
  bytes.push(0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
  bytes.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, ms);
  bytes.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, ecl);
  const len = store.length + 3;
  const pL = len & 0xff;
  const pH = (len >> 8) & 0xff;
  bytes.push(0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30);
  for (let i = 0; i < store.length; i++) bytes.push(store[i]);
  bytes.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
  return Buffer.from(bytes);
}

function getPrinterName(value: string | undefined): string | null {
  if (!value || !value.trim()) return null;
  return value.trim();
}

async function sendRawToWindowsPrinter(printerName: string, data: Buffer, docname = "BFC Receipt"): Promise<void> {
  // #region agent log
  fetch("http://127.0.0.1:7330/ingest/e360f4f2-ab8d-4cc6-b94b-f45235f7b95a", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "e0db05" },
    body: JSON.stringify({
      sessionId: "e0db05",
      location: "print.service.ts:sendRawToWindowsPrinter:entry",
      message: "sendRawToWindowsPrinter called",
      data: { printerName, dataLength: data.length },
      hypothesisId: "H2",
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  let driver: ReturnType<typeof getPrinterDriver>;
  try {
    driver = getPrinterDriver();
  } catch (e) {
    // #region agent log
    const errMsg = e instanceof Error ? e.message : String(e);
    fetch("http://127.0.0.1:7330/ingest/e360f4f2-ab8d-4cc6-b94b-f45235f7b95a", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "e0db05" },
      body: JSON.stringify({
        sessionId: "e0db05",
        location: "print.service.ts:sendRawToWindowsPrinter:getPrinterDriver",
        message: "getPrinterDriver threw",
        data: { error: errMsg },
        hypothesisId: "H3",
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    throw e;
  }
  return new Promise((resolve, reject) => {
    driver.printDirect({
      data,
      printer: printerName,
      docname,
      type: "RAW",
      success() {
        resolve();
      },
      error(err: Error) {
        const msg = err?.message ?? String(err);
        // #region agent log
        fetch("http://127.0.0.1:7330/ingest/e360f4f2-ab8d-4cc6-b94b-f45235f7b95a", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "e0db05" },
          body: JSON.stringify({
            sessionId: "e0db05",
            location: "print.service.ts:sendRawToWindowsPrinter:printDirect",
            message: "printDirect error",
            data: { error: msg },
            hypothesisId: "H5",
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        const enhanced =
          isLikelyRawUnsupported(msg) ? msg + RAW_UNSUPPORTED_HINT : msg;
        reject(new Error(enhanced));
      },
    });
  });
}

function lineItemDisplayParts(optionsJson: string | null | undefined): { primary: string; secondary: string[] } {
  const primary: string[] = [];
  const secondary: string[] = [];
  if (!optionsJson) return { primary: primary.join(" "), secondary };
  try {
    const opts = JSON.parse(optionsJson) as Array<{
      type?: string;
      baseType?: string;
      sizeLabel?: string;
      choice?: string;
      qty?: number;
      name?: string;
    }>;
    for (const o of opts) {
      if (o.type === "size" && o.baseType && o.sizeLabel) {
        const temp = (o.baseType ?? "").charAt(0) + (o.baseType ?? "").slice(1).toLowerCase();
        primary.push(`${temp} ${o.sizeLabel}`);
      } else if (o.type === "milk" && o.choice) {
        const c = (o.choice ?? "").toUpperCase().replace(/\s+/g, "_");
        if (c !== "FULL_CREAM") {
          const label =
            o.choice === "OAT" ? "Oat milk" : o.choice === "SOY" ? "Soy milk" : o.choice === "ALMOND" ? "Almond milk" : "Full cream";
          secondary.push(label);
        }
      } else if (o.type === "shots" && o.qty != null) {
        secondary.push(`${o.qty} shot${o.qty !== 1 ? "s" : ""}`);
      } else if (!o.type && o.name) {
        secondary.push(o.name);
      }
    }
  } catch {
    // ignore
  }
  return { primary: primary.join(" "), secondary };
}

/** Format: "CATEGORY: SUB-CATEGORY [Item Name Size Temp]" with safe fallbacks. Used for receipt and transaction displays. */
export function formatTransactionLineLabel(opts: {
  name: string;
  optionsJson?: string | null;
  categoryName?: string | null;
  subCategoryName?: string | null;
  qty: number;
  /** If true, append " xN" when qty > 1 (for receipt/display). */
  includeQuantity?: boolean;
}): string {
  const { name, optionsJson, categoryName, subCategoryName, qty, includeQuantity } = opts;
  const { primary } = lineItemDisplayParts(optionsJson);
  const bracketContent = [name.trim(), primary].filter(Boolean).join(" ").trim() || name.trim();
  const bracket = bracketContent ? `[${bracketContent}]` : "";
  let prefix = "";
  const cat = categoryName != null && String(categoryName).trim() !== "" ? String(categoryName).trim() : null;
  const sub = subCategoryName != null && String(subCategoryName).trim() !== "" ? String(subCategoryName).trim() : null;
  if (cat && sub) prefix = `${cat.toUpperCase()}: ${sub.toUpperCase()} `;
  else if (cat) prefix = `${cat.toUpperCase()} `;
  const base = prefix ? prefix + bracket : (bracket || name.trim());
  const qtySuffix = includeQuantity && qty > 1 ? ` x${qty}` : "";
  return base + qtySuffix;
}

function formatPesos(cents: number): string {
  return `Php ${(cents / 100).toFixed(2)}`;
}

/** Receipt line layout for 80mm paper: fixed width and price column so prices stay aligned. */
const RECEIPT_LINE_WIDTH = 48;
const RECEIPT_PRICE_COLUMN_WIDTH = 12;
const RECEIPT_TEXT_WIDTH = RECEIPT_LINE_WIDTH - RECEIPT_PRICE_COLUMN_WIDTH;

/** Wrap text to maxCharsPerLine for receipt; no truncation. Breaks at space when possible. */
function wrapReceiptText(text: string, maxCharsPerLine: number, maxLines = 15): string[] {
  const t = text.trim();
  if (!t) return [];
  const out: string[] = [];
  let rest = t;
  while (out.length < maxLines && rest.length > 0) {
    if (rest.length <= maxCharsPerLine) {
      out.push(rest);
      break;
    }
    let breakAt = rest.lastIndexOf(" ", maxCharsPerLine);
    if (breakAt <= 0) breakAt = maxCharsPerLine;
    out.push(rest.slice(0, breakAt).trim());
    rest = rest.slice(breakAt).trim();
  }
  if (rest.length > 0 && out.length < maxLines) out.push(rest);
  return out;
}

/** Wrap add-ons in a single parenthesis: one "(" on first line, one ")" on last line; break at comma boundaries. */
function wrapReceiptAddons(addonsStr: string, maxCharsPerLine: number): string[] {
  const t = addonsStr.trim();
  if (!t) return [];
  const inner = t.startsWith("(") && t.endsWith(")") ? t.slice(1, -1).trim() : t;
  if (!inner) return [];
  const parts = inner.split(", ").filter(Boolean);
  if (parts.length === 0) return [];
  const out: string[] = [];
  let line = "(" + parts[0];
  for (let i = 1; i < parts.length; i++) {
    const segment = ", " + parts[i];
    if (line.length + segment.length <= maxCharsPerLine) {
      line += segment;
    } else {
      out.push(line);
      line = "  " + parts[i];
    }
  }
  out.push(line + ")");
  return out;
}

/** Category-based: when stickerPrintCategoryIds is set, print if line has size/temp or line's category is in the list. When unset or empty, print no stickers. */
function shouldPrintSticker(
  line: { optionsJson?: string | null; categoryCloudId?: string | null },
  stickerPrintCategoryIds: string[] | null | undefined
): boolean {
  if (!stickerPrintCategoryIds?.length) return false;
  if (line.optionsJson) {
    try {
      const opts = JSON.parse(line.optionsJson) as Array<{ type?: string; baseType?: string; sizeLabel?: string }>;
      if (opts.some((o) => o.type === "size" && o.baseType && o.sizeLabel)) return true;
    } catch {
      // ignore
    }
  }
  if (line.categoryCloudId && stickerPrintCategoryIds.includes(line.categoryCloudId)) return true;
  return false;
}

type ParsedOpt =
  | { type: "size"; baseType: string; sizeLabel: string }
  | { type: "milk"; choice: string; upchargeCents?: number }
  | { type: "shots"; qty: number; upchargeCents?: number }
  | { type?: string; group?: string; name?: string };

function parseOptionsJson(optionsJson: string | null | undefined): ParsedOpt[] {
  if (!optionsJson) return [];
  try {
    return JSON.parse(optionsJson) as ParsedOpt[];
  } catch {
    return [];
  }
}

/** Soft-wrap text into up to maxLines lines of ~maxCharsPerLine. Breaks at space when possible; else breaks mid-word so the word continues on the next line. Truncates with "..." only if still over after maxLines. */
function wrapStickerText(text: string, maxLines: number, maxCharsPerLine: number): string[] {
  const t = text.trim();
  if (!t) return [];
  const out: string[] = [];
  let rest = t;
  while (out.length < maxLines && rest.length > 0) {
    if (rest.length <= maxCharsPerLine) {
      out.push(rest);
      rest = "";
      break;
    }
    let breakAt = rest.lastIndexOf(" ", maxCharsPerLine);
    if (breakAt <= 0) breakAt = maxCharsPerLine;
    out.push(rest.slice(0, breakAt).trim());
    rest = rest.slice(breakAt).trim();
  }
  if (rest.length > 0 && out.length > 0) {
    const lastIdx = out.length - 1;
    const last = out[lastIdx];
    const truncateAt = Math.max(0, maxCharsPerLine - 3);
    out[lastIdx] = last.length > truncateAt ? last.slice(0, truncateAt).trim() + "..." : last + "...";
  }
  return out.slice(0, maxLines);
}

function isStandardDrinkOptions(opts: ParsedOpt[]): boolean {
  const hasMilk = opts.some((o) => o && (o as ParsedOpt).type === "milk");
  const hasShotsUpcharge = opts.some((o) => {
    if (!o || (o as ParsedOpt).type !== "shots") return false;
    return ((o as { upchargeCents?: number }).upchargeCents ?? 0) > 0;
  });
  const hasAddOnOrNamed = opts.some((o) => {
    const x = o as { type?: string; group?: string; name?: string };
    if (x.type) return false;
    const g = (x.group ?? "").toUpperCase();
    return g.includes("ADD") || g.includes("SYRUP") || g.includes("EXTRA") || !!x.name;
  });
  return !hasMilk && !hasShotsUpcharge && !hasAddOnOrNamed;
}

/** Item label only (stickerName or line name). Used for single-line title or as second line when sub-category exists. */
function getStickerItemName(line: { name: string; stickerName?: string | null }): string {
  return (line.stickerName && line.stickerName.trim()) ? line.stickerName.trim() : line.name;
}

/** Role of each top row for font hierarchy: meta = small, item = large, temp = medium. */
type TopRowRole = "meta" | "item" | "temp";

/** Sticker top: FOR name (if present), then sub-category (own line), then item title (large), then temp+size (medium). No "||". */
function getStickerLineLabel(line: { name: string; optionsJson?: string | null; note?: string | null; stickerName?: string | null; subCategoryName?: string | null; specialInstructions?: string | null; customerName?: string | null }): { lines: string[]; topRowCount: number; topRoles: TopRowRole[] } {
  const opts = parseOptionsJson(line.optionsJson);
  const lines: string[] = [];
  const topRoles: TopRowRole[] = [];
  const itemName = getStickerItemName(line);
  const sub = line.subCategoryName != null && line.subCategoryName.trim() !== "" ? line.subCategoryName.trim() : null;
  const customerNameStr = line.customerName != null && line.customerName.trim() !== "" ? line.customerName.trim() : "";
  const sizeOpt = opts.find((o) => o && (o as ParsedOpt).type === "size") as { baseType?: string; sizeLabel?: string } | undefined;
  const tempSizeStr = sizeOpt?.baseType && sizeOpt?.sizeLabel
    ? (sizeOpt.baseType ?? "").charAt(0) + (sizeOpt.baseType ?? "").slice(1).toLowerCase() + " " + sizeOpt.sizeLabel
    : "";

  // Line 1: FOR {customerName} when present
  if (customerNameStr) {
    lines.push("FOR " + customerNameStr);
    topRoles.push("meta");
  }
  // Line 2 (or 1): sub-category on its own line
  if (sub) {
    lines.push(sub);
    topRoles.push("meta");
  }
  lines.push(itemName);
  topRoles.push("item");
  if (tempSizeStr) {
    lines.push(tempSizeStr);
    topRoles.push("temp");
  }
  const topRowCount = lines.length;

  const shotsOpt = opts.find((o) => o && (o as ParsedOpt).type === "shots") as { qty?: number; upchargeCents?: number } | undefined;
  if (shotsOpt && (shotsOpt.qty ?? 0) >= 1) {
    const qty = shotsOpt.qty ?? 0;
    lines.push(qty > 1 ? `${qty} SHOTS` : "1 SHOT");
  }

  const milkOpt = opts.find((o) => o && (o as ParsedOpt).type === "milk") as { choice?: string } | undefined;
  if (milkOpt?.choice) {
    const choice = milkOpt.choice;
    const label =
      choice === "OAT"
        ? "OAT MILK"
        : choice === "SOY"
          ? "SOY MILK"
          : choice === "ALMOND"
            ? "ALMOND MILK"
            : choice === "FULL_CREAM"
              ? "FULL CREAM"
              : choice
                ? choice.toUpperCase()
                : "";
    if (label) lines.push(label);
  }

  function normalizeModifierLabel(s: string): string {
    return s.trim().toUpperCase().replace(/\s+/g, " ");
  }
  const seenModifierLabels = new Set<string>();

  const sweetnessOpts = opts.filter((o) => {
    if (!o || (o as ParsedOpt).type) return false;
    const g = ((o as { group?: string }).group ?? "").toUpperCase();
    return /SUGAR|SWEET/.test(g);
  });
  for (const o of sweetnessOpts) {
    const raw = (o as { name?: string }).name ?? "";
    const name = normalizeModifierLabel(raw);
    if (name && !seenModifierLabels.has(name)) {
      seenModifierLabels.add(name);
      lines.push(name);
    }
  }

  const iceOpts = opts.filter((o) => {
    if (!o || (o as ParsedOpt).type) return false;
    const n = ((o as { name?: string }).name ?? "").toUpperCase();
    const g = ((o as { group?: string }).group ?? "").toUpperCase();
    if (/ICE/.test(g)) return true;
    if (/ICE/.test(n) && n !== "ICED") return true;
    if (/LESS|NO ICE|LIGHT ICE|EXTRA ICE|REGULAR ICE/.test(n)) return true;
    return false;
  });
  for (const o of iceOpts) {
    const raw = (o as { name?: string }).name ?? "";
    const name = normalizeModifierLabel(raw);
    if (name && !seenModifierLabels.has(name)) {
      seenModifierLabels.add(name);
      lines.push(name);
    }
  }

  const addOnOpts = opts.filter((o) => {
    if (!o || (o as ParsedOpt).type) return false;
    const g = ((o as { group?: string }).group ?? "").toUpperCase().replace(/\s+/g, " ");
    const n = ((o as { name?: string }).name ?? "").toUpperCase();
    if (/ADD|SYRUP|SAUCE|EXTRA|OPTION|TOPPING|DRIZZLE|CREAM|DESSERT/.test(g)) return true;
    return /SYRUP|SAUCE|ICE CREAM|WHIPPED|CREAM|DRIZZLE/.test(n);
  });
  const addOnNames: string[] = [];
  for (const o of addOnOpts) {
    const raw = (o as { name?: string }).name ?? "";
    const name = normalizeModifierLabel(raw);
    if (name && !seenModifierLabels.has(name)) {
      seenModifierLabels.add(name);
      addOnNames.push(name);
    }
  }
  if (addOnNames.length > 0) {
    const addOnsLabel = "Add-ons: " + addOnNames.join(", ");
    const addOnLines = wrapStickerText(addOnsLabel, 10, 28);
    for (const ln of addOnLines) lines.push(ln);
  }

  // Sticker prep: specialInstructions only. note is discount/audit and must NOT print on sticker.
  const prepText =
    line.specialInstructions != null && line.specialInstructions.trim() !== ""
      ? line.specialInstructions.trim().replace(/^"+|"+$/g, "")
      : null;

  if (prepText) {
    const prepLines = prepText
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => `[${s.replace(/[\[\]"]/g, "'")}]`);

    for (const prepLine of prepLines) {
      lines.push(prepLine);
    }
  }

  const filtered = lines.filter((s) => s.trim() !== "");
  return { lines: filtered, topRowCount, topRoles };
}

export type TransactionForPrint = {
  transactionNo: number;
  totalCents: number;
  createdAt: string;
  createdBy?: string | null;
  serviceType?: string | null;
  lineItems: Array<{
    name: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
    note?: string | null;
    optionsJson?: string | null;
    categoryCloudId?: string | null;
    /** Snapshot or resolved category name for receipt/display (e.g. "BFC MENU"). */
    categoryName?: string | null;
    /** Snapshot or resolved sub-category name for receipt/display (e.g. "BREWED"). */
    subCategoryName?: string | null;
    /** When set, used as the printable drink name on the sticker; else line name is used. */
    stickerName?: string | null;
    /** Item prep instructions only (quoted on sticker below ice). Distinct from note used for audit/discount. */
    specialInstructions?: string | null;
    /** Per-item customer name; printed on sticker left of temp/size line. */
    customerName?: string | null;
  }>;
  payments: Array<{ method: string; amountCents: number }>;
};

/** Optional receipt header from Settings/Business Details. */
export type ReceiptHeaderOptions = {
  businessName?: string | null;
  address?: string | null;
};

/** SnapResibo voucher to print on receipt (QR + label). */
export type SnapResiboVoucherForPrint = {
  voucherId: string;
  pricePhp: number; // 0 for free reward
};

export function buildReceiptEscPos(
  tx: TransactionForPrint,
  header?: ReceiptHeaderOptions | null,
  snapResiboVouchers?: SnapResiboVoucherForPrint[] | null
): Buffer {
  const paymentMethod = tx.payments[0]?.method ?? "CASH";
  const lines: string[] = [];

  if (header?.businessName?.trim()) {
    lines.push(header.businessName.trim());
  }
  if (header?.address?.trim()) {
    const addressLines = header.address.trim().split(",").map((s) => s.trim()).filter(Boolean);
    for (const line of addressLines) lines.push(line);
  }
  if (lines.length > 0) lines.push("");

  lines.push("RECEIPT #" + tx.transactionNo);
  lines.push(new Date(tx.createdAt).toLocaleString());
  if (tx.createdBy) lines.push("Cashier: " + tx.createdBy);
  const sep = "-".repeat(RECEIPT_LINE_WIDTH);
  lines.push(sep);
  for (const item of tx.lineItems) {
    const { primary, secondary } = lineItemDisplayParts(item.optionsJson);
    const secondaryDedup = secondary.filter(
      (s) => s !== primary && !primary.endsWith(" " + s)
    );
    const mods = [primary, ...secondaryDedup].filter(Boolean);
    const addonsStr = mods.length > 0 ? "(" + mods.join(", ") + ")" : "";
    const displayBase = formatTransactionLineLabel({
      name: item.name,
      optionsJson: item.optionsJson,
      categoryName: item.categoryName,
      subCategoryName: item.subCategoryName,
      qty: item.qty,
      includeQuantity: true,
    });
    const mainText = addonsStr ? `${displayBase} ${addonsStr}` : displayBase;
    const priceStr = formatPesos(item.lineTotal);
    const firstLineText = mainText.length <= RECEIPT_TEXT_WIDTH
      ? mainText
      : addonsStr
        ? displayBase
        : mainText;
    const paddedFirst = firstLineText.padEnd(RECEIPT_TEXT_WIDTH);
    lines.push(paddedFirst + priceStr.padStart(RECEIPT_PRICE_COLUMN_WIDTH));
    if (addonsStr && firstLineText === displayBase) {
      for (const line of wrapReceiptAddons(addonsStr, RECEIPT_TEXT_WIDTH)) {
        lines.push(line);
      }
    }
  }
  lines.push(sep);
  lines.push("TOTAL: " + formatPesos(tx.totalCents));
  lines.push("Payment: " + paymentMethod);
  lines.push("");
  lines.push("");

  let buf = Buffer.from(INIT + lines.join(LF) + LF + LF, "utf8");

  if (snapResiboVouchers && snapResiboVouchers.length > 0) {
    const snapParts: Buffer[] = [];
    for (const v of snapResiboVouchers) {
      const voucherId = v.voucherId;
      snapParts.push(Buffer.from("SNAPRESIBO" + LF, "utf8"));
      snapParts.push(Buffer.from(v.pricePhp > 0 ? "PHP " + v.pricePhp + LF : "FREE REWARD" + LF, "utf8"));
      snapParts.push(escPosQrBytes(voucherId, 6, 48));
      snapParts.push(Buffer.from(LF + voucherId + LF + LF, "utf8"));
    }
    buf = Buffer.concat([buf, ...snapParts]);
  }

  buf = Buffer.concat([buf, Buffer.from(FULL_CUT, "utf8")]);
  return buf;
}

/** Default dimensions (mm) when not in config. Portrait: width x height. */
const DEFAULT_STICKER_WIDTH_MM = 80;
const DEFAULT_STICKER_HEIGHT_MM = 60;
/** Dots per mm (~203 dpi). */
const TSPL_DOTS_PER_MM = 8;

/** TSPL rotation 90: X along label length (feed), Y across. On this printer larger X = top of label. */
const TSPL_MAIN_Y = 22;

// whole block anchor
const TSPL_BLOCK_BASE_X = 570;

/** Vertical step (dots) per top row. */
const TSPL_TOP_ROW_STEP = 38;
/** Extra gap (dots) after item title row so it does not touch temp+size. */
const TSPL_GAP_AFTER_ITEM = 14;
/** Extra gap (dots) after temp+size row so it does not touch first modifier (shots). */
const TSPL_GAP_AFTER_TEMP = -10;
/** Step between modifier rows (shots, milk, ice, etc.). */
const TSPL_MODIFIER_STEP = 38;
/** Transaction type: bottom-right, inside printable area with margin (dots from edges). */
const TSPL_TRANSACTION_TYPE_MARGIN_DOTS = 120;
/** Item title longer than this uses smaller font (1,2) so it fits on the sticker; else (2,2). */
const TSPL_ITEM_TITLE_LONG_CHARS = 14;

function tsplHeader(widthMm: number, heightMm: number): string {
  const w = Math.max(1, Math.round(widthMm));
  const h = Math.max(1, Math.round(heightMm));
  return `SIZE ${w} mm,${h} mm\nGAP 2 mm,0 mm\nDIRECTION 1\nREFERENCE 0,0\n`;
}

function escapeTsplString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/** TSPL rotation: 90 = 90° (X down label, Y across). */
const TSPL_ROTATION_90 = 90;

/** Cumulative vertical offset (dots) for top row index i; includes gaps after item and temp rows. */
function topRowCumulativeOffset(i: number, roles: TopRowRole[]): number {
  let offset = 0;
  for (let j = 0; j < i; j++) {
    offset += TSPL_TOP_ROW_STEP;
    if (roles[j] === "item") offset += TSPL_GAP_AFTER_ITEM;
    if (roles[j] === "temp") offset += TSPL_GAP_AFTER_TEMP;
  }
  return offset;
}

function buildOneLabelTspl(
  lines: string[],
  transactionTypeLabel?: string,
  widthMm?: number,
  heightMm?: number,
  topRowCount?: number,
  topRoles?: TopRowRole[]
): string {
  const out: string[] = ["CLS"];
  const mainY = TSPL_MAIN_Y;
  const top = topRowCount ?? 0;
  const roles = topRoles ?? [];
  const modifiersStartOffset = top > 0
    ? topRowCumulativeOffset(top, roles) + TSPL_TOP_ROW_STEP + (roles[top - 1] === "item" ? TSPL_GAP_AFTER_ITEM : 0) + (roles[top - 1] === "temp" ? TSPL_GAP_AFTER_TEMP : 0)
    : 0;

  for (let i = 0; i < lines.length; i++) {
    const content = lines[i].trim();
    if (!content) continue;
    const escaped = escapeTsplString(content);
    let x: number;
    if (i < top) {
      x = TSPL_BLOCK_BASE_X - topRowCumulativeOffset(i, roles);
      const role = roles[i];
      const isLongItem = role === "item" && content.length > TSPL_ITEM_TITLE_LONG_CHARS;
      const fontX = role === "item" ? (isLongItem ? 1 : 2) : 1;
      const fontY = role === "item" ? (isLongItem ? 2 : 2) : role === "temp" ? 2 : 1;
      out.push(`TEXT ${x},${mainY},"3",${TSPL_ROTATION_90},${fontX},${fontY},"${escaped}"`);
    } else {
      const modifierIndex = i - top;
      x = TSPL_BLOCK_BASE_X - (modifiersStartOffset + modifierIndex * TSPL_MODIFIER_STEP);
      out.push(`TEXT ${x},${mainY},"3",${TSPL_ROTATION_90},1,1,"${escaped}"`);
    }
  }
  if (transactionTypeLabel && widthMm != null && heightMm != null && widthMm > 0 && heightMm > 0) {
    const transactionTypeX = 25;
    const transactionTypeY = 325;
    const content = escapeTsplString(transactionTypeLabel.trim());
    out.push(`TEXT ${transactionTypeX},${transactionTypeY},"3",${TSPL_ROTATION_90},1,1,"${content}"`);
  }
  out.push("PRINT 1");
  return out.join("\n");
}

function formatTransactionTypeLabel(serviceType: string | null | undefined): string {
  const s = String(serviceType ?? "").trim().toUpperCase();

  if (!s) return "FOR HERE";

  const labelMap: Record<string, string> = {
    DINE_IN: "FOR HERE",
    FOR_HERE: "FOR HERE",

    TO_GO: "TAKEOUT",
    TAKEOUT: "TAKEOUT",
    TAKE_OUT: "TAKEOUT",

    DELIVERY: "DELIVERY",

    FOODPANDA: "FOODPANDA",
    FOOD_PANDA: "FOODPANDA",

    GRABFOOD: "GRABFOOD",
    GRAB_FOOD: "GRABFOOD",

    BFC_APP: "BFC APP",
    BFCAPP: "BFC APP",
  };

  return labelMap[s] ?? s;
}

/** Build TSPL string for sticker lines (caller must filter by shouldPrintSticker with stickerPrintCategoryIds). */
export function buildStickerTspl(
  tx: TransactionForPrint,
  widthMm = DEFAULT_STICKER_WIDTH_MM,
  heightMm = DEFAULT_STICKER_HEIGHT_MM
): string {
  if (tx.lineItems.length === 0) return "";

  const transactionTypeLabel = formatTransactionTypeLabel(tx.serviceType ?? undefined);
  console.log("[STICKER_VERIFY] raw serviceType:", tx.serviceType);
  console.log("[STICKER_VERIFY] computed transactionTypeLabel:", transactionTypeLabel);
  const blocks: string[] = [tsplHeader(widthMm, heightMm)];
  for (const line of tx.lineItems) {
    const { lines: lineLabels, topRowCount, topRoles } = getStickerLineLabel(line);
    blocks.push(buildOneLabelTspl(lineLabels, transactionTypeLabel, widthMm, heightMm, topRowCount, topRoles));
  }
  blocks.push("FORM 2,0\n"); // small feed so last label is not clipped
  return blocks.join("\n");
}

/** Build TSPL string for a single test label. Uses configured width/height (mm). */
export function buildTestStickerTspl(
  widthMm = DEFAULT_STICKER_WIDTH_MM,
  heightMm = DEFAULT_STICKER_HEIGHT_MM
): string {
  const header = tsplHeader(widthMm, heightMm);
  const testLines = ["BFC POS TEST", "Sticker OK"];
  return header + buildOneLabelTspl(testLines, "FOR HERE", widthMm, heightMm, 2, ["meta", "item"]) + "\nFORM 2,0\n";
}

export async function printReceiptToDevice(
  tx: TransactionForPrint,
  header?: ReceiptHeaderOptions | null,
  snapResiboVouchers?: SnapResiboVoucherForPrint[] | null
): Promise<void> {
  const config = await getPrinterConfig();
  const name = getPrinterName(config.receiptPrinter);
  if (!name) throw new Error("Printer not configured");
  const data = buildReceiptEscPos(tx, header, snapResiboVouchers);
  await sendRawToWindowsPrinter(name, data);
}

/** Print stickers. stickerPrintCategoryIds must be passed; lines must include categoryCloudId for category-based printing. */
export async function printStickersToDevice(
  tx: TransactionForPrint,
  opts: { stickerPrintCategoryIds: string[] | null | undefined }
): Promise<{ printed: number }> {
  const config = await getPrinterConfig();
  const name = getPrinterName(config.stickerPrinter);
  if (!name) throw new Error("Printer not configured");
  const stickerLines = tx.lineItems.filter((line) => shouldPrintSticker(line, opts.stickerPrintCategoryIds));
  if (stickerLines.length === 0) return { printed: 0 };
  const tspl = buildStickerTspl(
    { ...tx, lineItems: stickerLines },
    config.stickerWidthMm,
    config.stickerHeightMm
  );

  // Verification: log actual input and generated TSPL for first sticker (run one real print and inspect logs)
  const firstLine = stickerLines[0];
  const { lines: firstLineLabels, topRowCount, topRoles } = getStickerLineLabel(firstLine);
  const transactionTypeLabel = formatTransactionTypeLabel(tx.serviceType ?? undefined);
  const widthDots = Math.round(config.stickerWidthMm * TSPL_DOTS_PER_MM);
  const heightDots = Math.round(config.stickerHeightMm * TSPL_DOTS_PER_MM);
  const stickerVerifyInput = {
    firstLine: {
      name: firstLine.name,
      stickerName: firstLine.stickerName,
      subCategoryName: firstLine.subCategoryName,
      customerName: firstLine.customerName,
      optionsJson: firstLine.optionsJson,
      note: firstLine.note,
      specialInstructions: firstLine.specialInstructions,
      categoryCloudId: firstLine.categoryCloudId,
      qty: firstLine.qty,
      unitPrice: firstLine.unitPrice,
      lineTotal: firstLine.lineTotal,
    },
    serviceType: tx.serviceType,
    transactionTypeLabel,
    getStickerLineLabelResult: { lines: firstLineLabels, topRowCount, topRoles },
    boundsDots: { widthDots, heightDots },
  };
  const idxCls = tspl.indexOf("CLS");
  const idxPrint1 = tspl.indexOf("PRINT 1");
  const firstLabelBlock = idxCls >= 0 && idxPrint1 > idxCls ? tspl.slice(idxCls, idxPrint1 + 7) : "";
  const headerBlock = idxCls >= 0 ? tspl.slice(0, idxCls).trimEnd() : "";
  const fullFirstStickerTspl = headerBlock + (headerBlock ? "\n" : "") + firstLabelBlock;
  const textCommandRegex = /TEXT\s+(\d+),(\d+),"[^"]*",(\d+),[^,]+,[^,]+,"((?:[^"\\]|\\.)*)"/g;
  const textCommands: Array<{ i: number; x: number; y: number; rotation: number; text: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = textCommandRegex.exec(firstLabelBlock)) !== null) {
    textCommands.push({
      i: textCommands.length,
      x: parseInt(m[1], 10),
      y: parseInt(m[2], 10),
      rotation: parseInt(m[3], 10),
      text: m[4].replace(/\\"/g, '"').slice(0, 40),
    });
  }
  // #region agent log
  fetch("http://127.0.0.1:7330/ingest/e360f4f2-ab8d-4cc6-b94b-f45235f7b95a", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "162728" },
    body: JSON.stringify({
      sessionId: "162728",
      location: "print.service.ts:printStickersToDevice",
      message: "sticker verify input and TSPL",
      data: {
        stickerVerifyInput,
        fullFirstStickerTspl,
        textCommands,
        hypothesisId: "H1-H5",
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  console.log("[STICKER_VERIFY] === INPUT FIRST LINE (exact object used for sticker) ===");
  console.log(JSON.stringify(stickerVerifyInput, null, 2));
  console.log("[STICKER_VERIFY] === TEXT commands (x,y,rotation,text) ===");
  console.log(JSON.stringify(textCommands, null, 2));
  console.log("[STICKER_VERIFY] === FULL TSPL FIRST STICKER (SIZE through PRINT 1) ===");
  console.log(fullFirstStickerTspl);
  console.log("[STICKER_VERIFY] === END ===");

  const data = Buffer.from(tspl, "utf8");
  await sendRawToWindowsPrinter(name, data, "BFC Sticker");
  return { printed: stickerLines.length };
}

export function buildTestReceiptEscPos(): Buffer {
  const lines = [INIT, "", "BFC POS TEST", "Printer OK", "", ""].join(LF) + LF + LF + FULL_CUT;
  return Buffer.from(lines, "utf8");
}

export async function printTestReceiptToDevice(): Promise<void> {
  const config = await getPrinterConfig();
  // #region agent log
  fetch("http://127.0.0.1:7330/ingest/e360f4f2-ab8d-4cc6-b94b-f45235f7b95a", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "e0db05" },
    body: JSON.stringify({
      sessionId: "e0db05",
      location: "print.service.ts:printTestReceiptToDevice",
      message: "config loaded",
      data: { receiptPrinter: config.receiptPrinter, stickerPrinter: config.stickerPrinter },
      hypothesisId: "H1",
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  const name = getPrinterName(config.receiptPrinter);
  if (!name) throw new Error("Printer not configured");
  const data = buildTestReceiptEscPos();
  await sendRawToWindowsPrinter(name, data);
}

export async function printTestStickerToDevice(): Promise<void> {
  const config = await getPrinterConfig();
  const name = getPrinterName(config.stickerPrinter);
  if (!name) throw new Error("Printer not configured");
  const tspl = buildTestStickerTspl(config.stickerWidthMm, config.stickerHeightMm);
  const data = Buffer.from(tspl, "utf8");
  await sendRawToWindowsPrinter(name, data, "BFC Sticker");
}
