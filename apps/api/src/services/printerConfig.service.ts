/**
 * Local printer configuration stored in apps/api/data/printer-config.json.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// apps/api/data/printer-config.json (relative to this file in apps/api/src/services)
const CONFIG_PATH = path.join(__dirname, "..", "..", "data", "printer-config.json");

export type PrinterConfig = {
  receiptPrinter: string;
  stickerPrinter: string;
  stickerWidthMm: number;
  stickerHeightMm: number;
};

const DEFAULT_STICKER_WIDTH_MM = 80;
const DEFAULT_STICKER_HEIGHT_MM = 60;

const DEFAULT_CONFIG: PrinterConfig = {
  receiptPrinter: "",
  stickerPrinter: "",
  stickerWidthMm: DEFAULT_STICKER_WIDTH_MM,
  stickerHeightMm: DEFAULT_STICKER_HEIGHT_MM,
};

function parsePositiveNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.round(value);
  if (typeof value === "string") {
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return fallback;
}

export async function getPrinterConfig(): Promise<PrinterConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    const data = JSON.parse(raw) as Record<string, unknown>;
    return {
      receiptPrinter: typeof data.receiptPrinter === "string" ? data.receiptPrinter : "",
      stickerPrinter: typeof data.stickerPrinter === "string" ? data.stickerPrinter : "",
      stickerWidthMm: parsePositiveNumber(data.stickerWidthMm, DEFAULT_STICKER_WIDTH_MM),
      stickerHeightMm: parsePositiveNumber(data.stickerHeightMm, DEFAULT_STICKER_HEIGHT_MM),
    };
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") {
      return { ...DEFAULT_CONFIG };
    }
    throw err;
  }
}

export async function setPrinterConfig(config: PrinterConfig): Promise<void> {
  const dir = path.dirname(CONFIG_PATH);
  await mkdir(dir, { recursive: true });
  const out: PrinterConfig = {
    receiptPrinter: typeof config.receiptPrinter === "string" ? config.receiptPrinter.trim() : "",
    stickerPrinter: typeof config.stickerPrinter === "string" ? config.stickerPrinter.trim() : "",
    stickerWidthMm: parsePositiveNumber(config.stickerWidthMm, DEFAULT_STICKER_WIDTH_MM),
    stickerHeightMm: parsePositiveNumber(config.stickerHeightMm, DEFAULT_STICKER_HEIGHT_MM),
  };
  await writeFile(CONFIG_PATH, JSON.stringify(out, null, 2), "utf8");
}
