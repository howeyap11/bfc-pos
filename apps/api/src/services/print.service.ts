/**
 * Direct local receipt (ESC/POS) and sticker (TSPL) printing using Windows printer queue names.
 * Jobs are spooled as Win32 RAW (WritePrinter) via apps/api/scripts/send-raw-to-printer.ps1 — not the `print` command,
 * which does not reliably deliver binary ESC/POS or TSPL to thermal drivers.
 * Config from printer-config.json via getPrinterConfig(); queue names from printerDiscovery (Windows enumeration).
 */

import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";
import os from "os";
import crypto from "crypto";
import { getPrinterConfig } from "./printerConfig.service";
import { enumerateWindowsPrinters, type PrinterEnumerationResult } from "./printerDiscovery.service";
import {
  resolveExactOrCaseInsensitive,
  resolveStickerQueueName,
  trimPrinterName,
} from "./printerResolve.service";

const execFileAsync = promisify(execFile);

/** apps/api root (works from src/… with tsx or dist/… with node). */
function apiPackageRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
}

function rawPrintScriptPath(): string {
  return path.join(apiPackageRoot(), "scripts", "send-raw-to-printer.ps1");
}

function writeTempPrintFile(data: Buffer, ext: string): string {
  const name = `bfc-print-${process.pid}-${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
  const full = path.join(os.tmpdir(), name);
  fs.writeFileSync(full, data);
  return full;
}

async function sendRawFileToWindowsPrinter(filePath: string, printerName: string): Promise<void> {
  if (process.platform !== "win32") {
    throw new Error("RAW printing is only supported on Windows.");
  }
  const script = rawPrintScriptPath();
  if (!fs.existsSync(script)) {
    throw new Error(`RAW print script missing: ${script}`);
  }
  console.log("[BFC_PRINTER] send-raw (WritePrinter)", { printerName, filePath, script });
  try {
    await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        script,
        "-PrinterName",
        printerName,
        "-Path",
        filePath,
      ],
      { windowsHide: true, maxBuffer: 10 * 1024 * 1024 }
    );
  } catch (e: unknown) {
    const err = e as { stderr?: Buffer; stdout?: Buffer; message?: string };
    const stderr = err.stderr ? String(err.stderr).trim() : "";
    const stdout = err.stdout ? String(err.stdout).trim() : "";
    const msg = [err.message, stderr, stdout].filter(Boolean).join(" — ");
    throw new Error(msg || "RAW print failed");
  }
}

// ESC/POS receipt → temp file → Win32 RAW job
export async function printReceiptESC(data: Buffer, printerName: string) {
  const file = writeTempPrintFile(data, ".bin");
  try {
    await sendRawFileToWindowsPrinter(file, printerName);
  } finally {
    try {
      fs.unlinkSync(file);
    } catch {
      /* ignore */
    }
  }
}

// TSPL sticker bytes → temp file → Win32 RAW job
export async function printStickerTSPL(tspl: string, printerName: string) {
  const file = writeTempPrintFile(Buffer.from(tspl, "utf8"), ".raw");
  try {
    await sendRawFileToWindowsPrinter(file, printerName);
  } finally {
    try {
      fs.unlinkSync(file);
    } catch {
      /* ignore */
    }
  }
}

// ESC/POS
const ESC = "\x1b";
const GS = "\x1d";
const INIT = ESC + "@";
const LF = "\x0a";
const FULL_CUT = GS + "V\x00";
/** ESC/POS: print and feed n lines — ensures last text clears the print head before partial/full cut. */
const FEED_LINES_BEFORE_CUT = Buffer.from([0x1b, 0x64, 0x06]);
const OPEN_CASH_DRAWER_PULSE = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);

/** Fire-and-forget drawer pulse; failures must never affect receipt printing. */
async function pulseCashDrawer(printerName: string): Promise<void> {
  await printReceiptESC(OPEN_CASH_DRAWER_PULSE, printerName);
}

/**
 * Opens the cash drawer using the same ESC/POS pulse and configured receipt printer queue as CASH receipt printing.
 * Use for manual drawer open and anywhere else the drawer should behave like a cash sale.
 */
export async function openCashDrawerUsingConfiguredReceiptPrinter(): Promise<void> {
  const config = await getPrinterConfig();
  const name = requireResolvedWindowsQueue(config.receiptPrinter, "receipt", config.receiptPrinter);
  await pulseCashDrawer(name);
}

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

function assertPrinterEnumeration(enumResult: PrinterEnumerationResult): void {
  if (enumResult.code === "OK") return;
  throw new Error(
    `Printer enumeration failed (${enumResult.code}). ${enumResult.detail ?? ""}`.trim()
  );
}

/**
 * Resolve configured name to Windows queue name; logs comparison details to stdout.
 */
function requireResolvedWindowsQueue(
  configuredRaw: string | undefined,
  role: "receipt" | "sticker",
  receiptConfiguredRaw: string | undefined
): string {
  const configured = trimPrinterName(configuredRaw ?? "");
  const receiptConfigured = trimPrinterName(receiptConfiguredRaw ?? "");
  const enumResult = enumerateWindowsPrinters();

  console.log("[BFC_PRINTER] enumeration", {
    code: enumResult.code,
    windowsPrinterNamesExact: enumResult.printers,
    printerCount: enumResult.printers.length,
    detail: enumResult.detail,
    driverLoadOk: enumResult.code === "OK",
  });

  assertPrinterEnumeration(enumResult);

  if (enumResult.printers.length === 0) {
    throw new Error(
      "No printers returned by Windows (printer driver loaded but the queue list is empty). Add a printer in Windows Settings or check the print spooler."
    );
  }

  const receiptResolution = resolveExactOrCaseInsensitive(receiptConfigured, enumResult.printers);
  const receiptResolvedQueue =
    receiptResolution.kind === "exact_trim" || receiptResolution.kind === "case_insensitive"
      ? receiptResolution.queueName
      : null;

  console.log("[BFC_PRINTER] config names", {
    role,
    receiptConfigured,
    stickerConfigured: role === "sticker" ? configured : undefined,
    receiptCompare: {
      strategy: receiptResolution.kind,
      resolvedQueueName: receiptResolvedQueue,
      ambiguousCandidates:
        receiptResolution.kind === "ambiguous_ci" ? receiptResolution.candidates : undefined,
    },
  });

  if (role === "receipt") {
    if (!configured) {
      throw new Error("Receipt printer not configured");
    }
    const r = resolveExactOrCaseInsensitive(configured, enumResult.printers);
    console.log("[BFC_PRINTER] receipt name resolution", {
      configured,
      strategy: r.kind,
      resolvedQueueName: r.kind === "ambiguous_ci" ? null : r.queueName,
      ambiguousCandidates: r.kind === "ambiguous_ci" ? r.candidates : undefined,
      matchedViaCaseInsensitive: r.kind === "case_insensitive",
    });
    if (r.kind === "ambiguous_ci") {
      throw new Error(
        `Multiple Windows printers match receipt name "${configured}" (case-insensitive): ${r.candidates.join(", ")}`
      );
    }
    if (!r.queueName) {
      throw new Error(
        `Configured receipt printer not found: "${configured}". Windows queues: ${enumResult.printers.join(" | ")}`
      );
    }
    return r.queueName;
  }

  if (!configured) {
    throw new Error("Sticker printer not configured");
  }

  const s = resolveStickerQueueName(configured, enumResult.printers, receiptResolvedQueue);
  console.log("[BFC_PRINTER] sticker name resolution", {
    configured,
    resolvedReceiptQueueName: receiptResolvedQueue,
    strategy: s.kind,
    resolvedQueueName:
      s.kind === "ambiguous_ci" || s.kind === "ambiguous_contains" || s.kind === "none"
        ? null
        : s.queueName,
    ambiguousCandidates:
      s.kind === "ambiguous_ci" || s.kind === "ambiguous_contains" ? s.candidates : undefined,
  });

  if (s.kind === "ambiguous_ci") {
    throw new Error(
      `Multiple Windows printers match sticker name "${configured}" (case-insensitive): ${s.candidates.join(", ")}`
    );
  }
  if (s.kind === "ambiguous_contains") {
    throw new Error(
      `Multiple Windows printers partially match sticker name "${configured}": ${s.candidates.join(", ")}. Choose the exact queue name in Settings.`
    );
  }
  if (!s.queueName) {
    throw new Error(
      `Configured sticker printer not found: "${configured}". Windows queues: ${enumResult.printers.join(" | ")}`
    );
  }
  return s.queueName;
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

/**
 * Wrap text to maxCharsPerLine for receipt. Breaks at space when possible.
 * Does not drop trailing content: continues until rest is empty (maxLines is a safety cap only).
 */
function wrapReceiptText(text: string, maxCharsPerLine: number, maxLines = 200): string[] {
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
  while (rest.length > 0 && out.length < maxLines) {
    if (rest.length <= maxCharsPerLine) {
      out.push(rest);
      break;
    }
    let breakAt = rest.lastIndexOf(" ", maxCharsPerLine);
    if (breakAt <= 0) breakAt = maxCharsPerLine;
    out.push(rest.slice(0, breakAt).trim());
    rest = rest.slice(breakAt).trim();
  }
  return out;
}

/** Left side of receipt main line: quantity (if >1), item name, size/temperature. */
function buildReceiptItemMainLeft(qty: number, name: string, sizeTempPrimary: string): string {
  const q = qty > 1 ? `${qty}× ` : "";
  const st = sizeTempPrimary.trim();
  const n = name.trim();
  if (st && n) return `${q}${n} ${st}`.trim();
  return `${q}${n}`.trim();
}

/** When DB line name already embeds size/temp (e.g. display label), do not append primary again. */
function receiptNameAndSizeTempForPrint(name: string, primary: string): { nameForLine: string; sizeTemp: string } {
  const st = primary.trim();
  const n = name.trim();
  if (!st) return { nameForLine: n, sizeTemp: "" };
  if (n.toLowerCase().includes(st.toLowerCase())) {
    return { nameForLine: n, sizeTemp: "" };
  }
  return { nameForLine: n, sizeTemp: st };
}

/** Omit secondary tokens that duplicate the size/temp line or item name (stops doubled modifier lines). */
function receiptItemSecondaryDedup(secondary: string[], primary: string, itemName: string): string[] {
  const p = primary.trim().toLowerCase();
  const nameLow = itemName.trim().toLowerCase();
  const primaryTokens = new Set(p.split(/\s+/).filter((t) => t.length > 1));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of secondary) {
    const s = raw.trim();
    if (!s) continue;
    const sl = s.toLowerCase();
    if (seen.has(sl)) continue;
    if (p && (sl === p || p.includes(sl))) continue;
    if (p && primaryTokens.has(sl)) continue;
    if (nameLow && sl.length >= 3 && nameLow.includes(sl)) continue;
    seen.add(sl);
    out.push(s);
  }
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
  /** Transaction total in centavos (matches DB Transaction.totalCents). */
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

/** Optional receipt header from cloud-synced Business Details + Receipt Details (local StoreConfig). */
export type ReceiptHeaderOptions = {
  businessName?: string | null;
  address?: string | null;
  receiptTaxType?: string | null;
  receiptNonVatTin?: string | null;
  receiptVatTin?: string | null;
  receiptBirMin?: string | null;
  receiptBirSerialNo?: string | null;
};

/** Center text for 80mm monospace receipt (visual centering with spaces; OK for thermal). */
function centerReceiptLine(textArg: string, width: number): string {
  const text = textArg.trim();
  if (!text) return "";
  if (text.length >= width) return text;
  const pad = width - text.length;
  const left = Math.floor(pad / 2);
  return " ".repeat(left) + text + " ".repeat(pad - left);
}

/** Single labeled TIN line: NON VAT REG TIN vs VAT REG TIN from tax type and filled fields, with value-matched fallback. */
function receiptTinLineForPrint(header: ReceiptHeaderOptions | null | undefined): string | null {
  if (!header) return null;
  const tt = (header.receiptTaxType ?? "").trim().toUpperCase();
  const vat = (header.receiptVatTin ?? "").trim();
  const nonVat = (header.receiptNonVatTin ?? "").trim();
  const useVat = tt.includes("VAT") && !tt.includes("NONVAT");

  if (!useVat && nonVat) return `NON VAT REG TIN: ${nonVat}`;
  if (useVat && vat) return `VAT REG TIN: ${vat}`;
  if (nonVat) return `NON VAT REG TIN: ${nonVat}`;
  if (vat) return `VAT REG TIN: ${vat}`;
  return null;
}

function appendProductionReceiptHeader(lines: string[], header?: ReceiptHeaderOptions | null): void {
  if (!header) return;
  let wrote = false;
  const name = (header.businessName ?? "").trim();
  if (name) {
    for (const w of wrapReceiptText(name, RECEIPT_LINE_WIDTH)) {
      if (w.trim()) lines.push(centerReceiptLine(w, RECEIPT_LINE_WIDTH));
      wrote = true;
    }
  }
  const addrRaw = (header.address ?? "").trim();
  if (addrRaw) {
    const segments = addrRaw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    for (const seg of segments) {
      for (const w of wrapReceiptText(seg, RECEIPT_LINE_WIDTH)) {
        if (w.trim()) lines.push(centerReceiptLine(w, RECEIPT_LINE_WIDTH));
        wrote = true;
      }
    }
  }
  const tinLine = receiptTinLineForPrint(header);
  if (tinLine) {
    for (const w of wrapReceiptText(tinLine, RECEIPT_LINE_WIDTH)) {
      lines.push(w);
    }
    wrote = true;
  }
  const minV = (header.receiptBirMin ?? "").trim();
  if (minV) {
    for (const w of wrapReceiptText(`MIN: ${minV}`, RECEIPT_LINE_WIDTH)) {
      lines.push(w);
    }
    wrote = true;
  }
  const sn = (header.receiptBirSerialNo ?? "").trim();
  if (sn) {
    for (const w of wrapReceiptText(`S/N: ${sn}`, RECEIPT_LINE_WIDTH)) {
      lines.push(w);
    }
    wrote = true;
  }
  if (wrote) lines.push("");
}

/** SnapResibo voucher footer after totals: "SNAPRESIBO" + QR (voucherId in payload); no plain voucher id line. */
export type SnapResiboVoucherForPrint = {
  voucherId: string;
  pricePhp: number; // 0 for free reward
};

/**
 * Physical receipt ESC/POS body (text lines). Header: centered name/address; labeled NON VAT / VAT TIN; MIN; S/N — then RECEIPT #.
 * Chain: POST /pos/transactions/:id/print-receipt → printReceiptToDevice → buildReceiptEscPos → printReceiptESC
 */
export function buildReceiptEscPos(
  tx: TransactionForPrint,
  header?: ReceiptHeaderOptions | null,
  snapResiboVouchers?: SnapResiboVoucherForPrint[] | null
): Buffer {
  const paymentMethod = tx.payments[0]?.method ?? "CASH";
  const lines: string[] = [];

  appendProductionReceiptHeader(lines, header);

  lines.push("RECEIPT #" + tx.transactionNo);
  lines.push(new Date(tx.createdAt).toLocaleString());
  if (tx.createdBy) lines.push("Cashier: " + tx.createdBy);
  const sep = "-".repeat(RECEIPT_LINE_WIDTH);
  lines.push(sep);
  for (const item of tx.lineItems) {
    const { primary, secondary } = lineItemDisplayParts(item.optionsJson);
    const { nameForLine, sizeTemp } = receiptNameAndSizeTempForPrint(item.name, primary);
    const secondaryDedup = receiptItemSecondaryDedup(secondary, primary, item.name);

    const sub = item.subCategoryName != null && item.subCategoryName.trim() !== "" ? item.subCategoryName.trim() : null;
    if (sub) {
      for (const w of wrapReceiptText(sub, RECEIPT_LINE_WIDTH)) {
        lines.push(w);
      }
    }

    const mainLeft = buildReceiptItemMainLeft(item.qty, nameForLine, sizeTemp);
    const priceStr = formatPesos(item.lineTotal);
    const mainChunks = mainLeft.trim() ? wrapReceiptText(mainLeft, RECEIPT_TEXT_WIDTH) : [""];
    lines.push(mainChunks[0].padEnd(RECEIPT_TEXT_WIDTH) + priceStr.padStart(RECEIPT_PRICE_COLUMN_WIDTH));
    for (let i = 1; i < mainChunks.length; i++) {
      lines.push(mainChunks[i]);
    }

    const optionParts = secondaryDedup.map((s) => s.trim()).filter(Boolean);
    if (optionParts.length > 0) {
      for (const w of wrapReceiptAddons(optionParts.join(", "), RECEIPT_LINE_WIDTH)) {
        lines.push(w);
      }
    }
  }
  lines.push(sep);
  lines.push("TOTAL: " + formatPesos(tx.totalCents));
  lines.push("Payment: " + paymentMethod);
  lines.push("");
  lines.push("");

  const receiptTextBody = lines.join(LF);

  let buf = Buffer.from(INIT + receiptTextBody + LF, "utf8");

  if (snapResiboVouchers && snapResiboVouchers.length > 0) {
    const snapParts: Buffer[] = [];
    for (const v of snapResiboVouchers) {
      const voucherId = v.voucherId;
      snapParts.push(Buffer.from("SNAPRESIBO" + LF, "utf8"));
      snapParts.push(escPosQrBytes(voucherId, 6, 48));
      snapParts.push(Buffer.from(LF + LF, "utf8"));
    }
    buf = Buffer.concat([buf, ...snapParts]);
  }

  return Buffer.concat([buf, FEED_LINES_BEFORE_CUT, Buffer.from(FULL_CUT, "binary")]);
}

/** Default dimensions (mm) when not in config. Portrait: width x height. */
const DEFAULT_STICKER_WIDTH_MM = 80;
const DEFAULT_STICKER_HEIGHT_MM = 60;
/** Dots per mm (~203 dpi). */
const TSPL_DOTS_PER_MM = 8;

/** TSPL rotation 90: X along label length (feed), Y across. On this printer larger X = top of label. */
const TSPL_MAIN_Y = 22;

// whole block anchor
const TSPL_BLOCK_BASE_X = 550;

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
    const copies = Math.max(1, Math.trunc(line.qty || 1));
    for (let i = 0; i < copies; i++) {
      blocks.push(buildOneLabelTspl(lineLabels, transactionTypeLabel, widthMm, heightMm, topRowCount, topRoles));
    }
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
  const name = requireResolvedWindowsQueue(config.receiptPrinter, "receipt", config.receiptPrinter);
  const shouldOpenDrawer = tx.payments.some((p) => p.method === "CASH");

  if (shouldOpenDrawer) {
    void pulseCashDrawer(name).catch(() => {
      // Fail silently by design so drawer issues never block receipt printing.
    });
  }

  const data = buildReceiptEscPos(tx, header, snapResiboVouchers);
  await printReceiptESC(data, name);
}

/** Print stickers. stickerPrintCategoryIds must be passed; lines must include categoryCloudId for category-based printing. */
export async function printStickersToDevice(
  tx: TransactionForPrint,
  opts: { stickerPrintCategoryIds: string[] | null | undefined }
): Promise<{ printed: number }> {
  const config = await getPrinterConfig();
  const name = requireResolvedWindowsQueue(config.stickerPrinter, "sticker", config.receiptPrinter);
  const stickerLines = tx.lineItems.filter((line) => shouldPrintSticker(line, opts.stickerPrintCategoryIds));
  const totalStickerCopies = stickerLines.reduce((sum, line) => sum + Math.max(1, Math.trunc(line.qty || 1)), 0);
  if (totalStickerCopies === 0) return { printed: 0 };
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
  console.log("[STICKER_VERIFY] === INPUT FIRST LINE (exact object used for sticker) ===");
  console.log(JSON.stringify(stickerVerifyInput, null, 2));
  console.log("[STICKER_VERIFY] === TEXT commands (x,y,rotation,text) ===");
  console.log(JSON.stringify(textCommands, null, 2));
  console.log("[STICKER_VERIFY] === FULL TSPL FIRST STICKER (SIZE through PRINT 1) ===");
  console.log(fullFirstStickerTspl);
  console.log("[STICKER_VERIFY] === END ===");

  await printStickerTSPL(tspl, name);
  return { printed: totalStickerCopies };
}

export function buildTestReceiptEscPos(): Buffer {
  const body = INIT + ["", "BFC POS TEST", "Printer OK", "", ""].join(LF) + LF;
  return Buffer.concat([Buffer.from(body, "utf8"), FEED_LINES_BEFORE_CUT, Buffer.from(FULL_CUT, "binary")]);
}

export async function printTestReceiptToDevice(): Promise<void> {
  const config = await getPrinterConfig();
  const name = requireResolvedWindowsQueue(config.receiptPrinter, "receipt", config.receiptPrinter);
  const data = buildTestReceiptEscPos();
  await printReceiptESC(data, name);
}

/** Print raw ESC/POS bytes to the configured receipt printer queue. Uses same printer-config.json as Settings -> Printer. */
export async function printRawEscPosToReceiptPrinter(data: Buffer): Promise<void> {
  const config = await getPrinterConfig();
  const configuredFromSettings = config.receiptPrinter;
  console.log("[BFC_PRINTER] report print: printer name loaded from settings (printer-config.json)", {
    receiptPrinter: configuredFromSettings,
  });
  const name = requireResolvedWindowsQueue(config.receiptPrinter, "receipt", config.receiptPrinter);
  console.log("[BFC_PRINTER] report print: printer name passed into print service (resolved Windows queue)", {
    resolvedQueueName: name,
  });
  try {
    await printReceiptESC(data, name);
    console.log("[BFC_PRINTER] report print: print result OK", { printerName: name });
  } catch (err) {
    console.error("[BFC_PRINTER] report print: print failure", {
      printerName: name,
      configuredFromSettings,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export async function printTestStickerToDevice(): Promise<void> {
  const config = await getPrinterConfig();
  const name = requireResolvedWindowsQueue(config.stickerPrinter, "sticker", config.receiptPrinter);
  const tspl = buildTestStickerTspl(config.stickerWidthMm, config.stickerHeightMm);
  await printStickerTSPL(tspl, name);
}
