/**
 * Discovers printers installed on the system (Windows printer names, etc.).
 * Used to populate POS settings so staff can select receipt and sticker printers.
 * Lazy-loads @woovi/node-printer so the API can start even when the native addon is missing.
 */

import { createRequire } from "module";

const require = createRequire(import.meta.url);

export type PrinterEnumerationCode =
  | "OK"
  | "NATIVE_MISSING"
  | "MODULE_LOAD_FAILED"
  | "GETPRINTERS_THREW"
  | "NON_ARRAY";

export type PrinterEnumerationResult = {
  code: PrinterEnumerationCode;
  /** Trimmed Windows queue names in enumeration order */
  printers: string[];
  detail?: string;
};

function isNativeModuleMissingError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("cannot find module '@woovi/node-printer'") ||
    m.includes("cannot find module \"@woovi/node-printer\"") ||
    m.includes("cannot resolve module '@woovi/node-printer'") ||
    m.includes("could not locate the bindings file")
  );
}

/**
 * Enumerate Windows printers via @woovi/node-printer. Does not throw.
 */
export function enumerateWindowsPrinters(): PrinterEnumerationResult {
  let printerModule: { getPrinters: () => unknown };
  try {
    printerModule = require("@woovi/node-printer") as { getPrinters: () => unknown };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      code: isNativeModuleMissingError(msg) ? "NATIVE_MISSING" : "MODULE_LOAD_FAILED",
      printers: [],
      detail: msg,
    };
  }

  let list: unknown;
  try {
    list = printerModule.getPrinters();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { code: "GETPRINTERS_THREW", printers: [], detail: msg };
  }

  if (!Array.isArray(list)) {
    return {
      code: "NON_ARRAY",
      printers: [],
      detail: `getPrinters returned ${typeof list}`,
    };
  }

  const printers = list
    .map((p) => (p && typeof (p as { name?: string }).name === "string" ? (p as { name: string }).name.trim() : ""))
    .filter(Boolean);

  return { code: "OK", printers };
}

/**
 * Returns the list of available printer names from the OS.
 * If the native printer module is missing or fails, returns [] (backward compatible).
 */
export function getAvailablePrinters(): string[] {
  return enumerateWindowsPrinters().printers;
}
