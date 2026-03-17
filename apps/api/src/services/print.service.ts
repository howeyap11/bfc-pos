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
  return { primary: primary.join(" "), secondary };
}

function formatPesos(cents: number): string {
  return `Php ${(cents / 100).toFixed(2)}`;
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

/** Soft-wrap text into up to maxLines lines of ~maxCharsPerLine; truncate last line with "..." if over. */
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

/** Sticker-print drink name: "Sub-category: Item" when subCategoryName set, else optional stickerName, else line name. */
function getStickerDrinkName(line: { name: string; stickerName?: string | null; subCategoryName?: string | null }): string {
  const itemLabel = (line.stickerName && line.stickerName.trim()) ? line.stickerName.trim() : line.name;
  const sub = line.subCategoryName != null && line.subCategoryName.trim() !== "" ? line.subCategoryName.trim() : null;
  return sub ? `${sub}: ${itemLabel}` : itemLabel;
}

/** Sticker line order: 1 drink name (with optional sub-category), 2 temp+size (with optional customer name left), 3 shots, 4 milk, 5 sweetness (once), 6 add-ons (grouped, wrapped), 7 ice, 8 special instructions (quoted). Transaction type at bottom-right. Uses specialInstructions only for prep; note is audit-only. customerName prints left of temp/size. */
function getStickerLineLabel(line: { name: string; optionsJson?: string | null; note?: string | null; stickerName?: string | null; subCategoryName?: string | null; specialInstructions?: string | null; customerName?: string | null }): string[] {
  const opts = parseOptionsJson(line.optionsJson);
  const lines: string[] = [];

  const primaryName = getStickerDrinkName(line);
  lines.push(primaryName);

  const sizeOpt = opts.find((o) => o && (o as ParsedOpt).type === "size") as { baseType?: string; sizeLabel?: string } | undefined;
  const tempSizeStr = sizeOpt?.baseType && sizeOpt?.sizeLabel
    ? (sizeOpt.baseType ?? "").charAt(0) + (sizeOpt.baseType ?? "").slice(1).toLowerCase() + " " + sizeOpt.sizeLabel
    : "";
  const customerNameStr = line.customerName != null && line.customerName.trim() !== "" ? line.customerName.trim() : "";
  if (customerNameStr && tempSizeStr) {
    lines.push(`${customerNameStr} · ${tempSizeStr}`);
  } else if (tempSizeStr) {
    lines.push(tempSizeStr);
  } else if (customerNameStr) {
    lines.push(customerNameStr);
  }

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
    const addOnLines = wrapStickerText(addOnsLabel, 3, 24);
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

  return lines.filter(Boolean);
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
    /** When set, used as the printable drink name on the sticker; else line name is used. */
    stickerName?: string | null;
    /** Item prep instructions only (quoted on sticker below ice). Distinct from note used for audit/discount. */
    specialInstructions?: string | null;
    /** Per-item customer name; printed on sticker left of temp/size line. */
    customerName?: string | null;
    /** Sub-category name for sticker title line (e.g. "Espresso: Caramel Macchiato"). */
    subCategoryName?: string | null;
  }>;
  payments: Array<{ method: string; amountCents: number }>;
};

export function buildReceiptEscPos(tx: TransactionForPrint): Buffer {
  const paymentMethod = tx.payments[0]?.method ?? "CASH";
  const lines: string[] = [];
  lines.push("");
  lines.push("RECEIPT #" + tx.transactionNo);
  lines.push(new Date(tx.createdAt).toLocaleString());
  if (tx.createdBy) lines.push("Cashier: " + tx.createdBy);
  lines.push("--------------------------------");
  for (const item of tx.lineItems) {
    const { primary, secondary } = lineItemDisplayParts(item.optionsJson);
    const mods = [primary, ...secondary].filter(Boolean).join(" ");
    const left = `${item.qty} x ${item.name}${mods ? " (" + mods + ")" : ""}`;
    const right = formatPesos(item.lineTotal);
    const pad = 32 - left.length - right.length;
    lines.push(left + (pad > 0 ? " ".repeat(pad) : " ") + right);
  }
  lines.push("--------------------------------");
  lines.push("TOTAL: " + formatPesos(tx.totalCents));
  lines.push("Payment: " + paymentMethod);
  lines.push("");
  lines.push("");

  const text = lines.join(LF) + LF;
  const buf = Buffer.from(INIT + text + LF + LF + FULL_CUT, "utf8");
  return buf;
}

/** Default dimensions (mm) when not in config. Portrait: width x height. */
const DEFAULT_STICKER_WIDTH_MM = 80;
const DEFAULT_STICKER_HEIGHT_MM = 60;
/** Dots per mm (~203 dpi). */
const TSPL_DOTS_PER_MM = 8;

/** TSPL rotation 90: X along label length (feed), Y across. On this printer larger X = top of label. We use x = heightDots - offset; to move content UP we need larger x, so SMALLER offset. TSPL_SHIFT_UP_DOTS is subtracted from offsets so the block shifts up. */
const TSPL_MAIN_Y = 22;

// whole block anchor
const TSPL_BLOCK_BASE_X = 570;

// relative spacing inside the block
const TSPL_DRINK_NAME_OFFSET = 0;
const TSPL_TEMP_SIZE_OFFSET = 75;
const TSPL_MODIFIERS_START_OFFSET = 140;
const TSPL_MODIFIER_STEP = 38;
/** Transaction type: bottom-right, inside printable area with margin (dots from edges). */
const TSPL_TRANSACTION_TYPE_MARGIN_DOTS = 120;

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

function buildOneLabelTspl(
  labelText: string,
  transactionTypeLabel?: string,
  widthMm?: number,
  heightMm?: number
): string {
  const lines = labelText.split("\n").filter(Boolean);
  const out: string[] = ["CLS"];
  const mainY = TSPL_MAIN_Y;
  for (let i = 0; i < lines.length; i++) {
    const content = escapeTsplString(lines[i].trim());
    const isDrinkName = i === 0;
    const isTempSize = i === 1 && lines.length >= 2;
    let x: number;
    if (isDrinkName) {
      x = TSPL_BLOCK_BASE_X - TSPL_DRINK_NAME_OFFSET;
    } else if (isTempSize) {
      x = TSPL_BLOCK_BASE_X - TSPL_TEMP_SIZE_OFFSET;
    } else {
      const modifierIndex = i - 2;
      x = TSPL_BLOCK_BASE_X - (TSPL_MODIFIERS_START_OFFSET + modifierIndex * TSPL_MODIFIER_STEP);
    }
    if (isDrinkName) {
      out.push(`TEXT ${x},${mainY},"3",${TSPL_ROTATION_90},2,2,"${content}"`);
    } else if (isTempSize) {
      out.push(`TEXT ${x},${mainY},"3",${TSPL_ROTATION_90},1,2,"${content}"`);
    } else {
      out.push(`TEXT ${x},${mainY},"3",${TSPL_ROTATION_90},1,1,"${content}"`);
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
  if (s === "DINE_IN" || s === "FOR_HERE") return "FOR HERE";
  if (s === "TO_GO" || s === "TAKEOUT") return "TAKEOUT";
  if (s === "DELIVERY") return "DELIVERY";
  if (s === "FOODPANDA") return "FOODPANDA";
  if (s === "GRABFOOD") return "GRABFOOD";

  return s;
}

/** Build TSPL string for sticker lines (caller must filter by shouldPrintSticker with stickerPrintCategoryIds). */
export function buildStickerTspl(
  tx: TransactionForPrint,
  widthMm = DEFAULT_STICKER_WIDTH_MM,
  heightMm = DEFAULT_STICKER_HEIGHT_MM
): string {
  if (tx.lineItems.length === 0) return "";

  const transactionTypeLabel = formatTransactionTypeLabel(tx.serviceType ?? undefined);
  const blocks: string[] = [tsplHeader(widthMm, heightMm)];
  for (const line of tx.lineItems) {
    const lineLabels = getStickerLineLabel(line);
    const labelText = lineLabels.filter(Boolean).join("\n");
    blocks.push(buildOneLabelTspl(labelText, transactionTypeLabel, widthMm, heightMm));
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
  const testLabel = "BFC POS TEST\nSticker OK";
  return header + buildOneLabelTspl(testLabel, "FOR HERE", widthMm, heightMm) + "\nFORM 2,0\n";
}

export async function printReceiptToDevice(tx: TransactionForPrint): Promise<void> {
  const config = await getPrinterConfig();
  const name = getPrinterName(config.receiptPrinter);
  if (!name) throw new Error("Printer not configured");
  const data = buildReceiptEscPos(tx);
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
  const lineLabels = getStickerLineLabel(firstLine);
  const transactionTypeLabel = formatTransactionTypeLabel(tx.serviceType ?? undefined);
  const widthDots = Math.round(config.stickerWidthMm * TSPL_DOTS_PER_MM);
  const heightDots = Math.round(config.stickerHeightMm * TSPL_DOTS_PER_MM);
  const stickerVerifyInput = {
    firstLine: {
      name: firstLine.name,
      stickerName: firstLine.stickerName,
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
    getStickerLineLabelResult: lineLabels,
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
