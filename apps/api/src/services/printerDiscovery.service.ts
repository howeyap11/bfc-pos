/**
 * Discovers printers installed on the system (Windows printer queue names).
 * Used to populate POS settings so staff can select receipt and sticker printers.
 * Uses PowerShell (Get-CimInstance Win32_Printer) — no native Node addons.
 */

import { execSync } from "child_process";

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

/**
 * Enumerate Windows printers via PowerShell. Does not throw.
 */
export function enumerateWindowsPrinters(): PrinterEnumerationResult {
  if (process.platform !== "win32") {
    return {
      code: "OK",
      printers: [],
      detail: "Printer enumeration is only supported on Windows.",
    };
  }

  try {
    const out = execSync(
      'powershell -NoProfile -NonInteractive -Command "Get-CimInstance -ClassName Win32_Printer | Select-Object -ExpandProperty Name"',
      {
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true,
      }
    );
    const printers = out
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    return { code: "OK", printers };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { code: "GETPRINTERS_THREW", printers: [], detail: msg };
  }
}

/**
 * Returns the list of available printer names from the OS.
 * If enumeration fails, returns [] (backward compatible).
 */
export function getAvailablePrinters(): string[] {
  return enumerateWindowsPrinters().printers;
}
