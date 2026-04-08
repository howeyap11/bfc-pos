/**
 * Discovers printers installed on the system (Windows printer queue names).
 * Used to populate POS settings so staff can select receipt and sticker printers.
 * Uses PowerShell (Get-CimInstance Win32_Printer) — no native Node addons.
 */

import { spawnSync } from "child_process";
import path from "path";

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

function windowsPowerShellExe(): string {
  const root = process.env.SystemRoot || process.env.windir || "C:\\Windows";
  return path.join(root, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
}

function parsePrinterLines(stdout: string): string[] {
  return stdout
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Enumerate Windows printers via PowerShell. Does not throw.
 * Uses spawnSync with argv (avoids cmd.exe quoting bugs that break -Command strings).
 */
export function enumerateWindowsPrinters(): PrinterEnumerationResult {
  if (process.platform !== "win32") {
    return {
      code: "OK",
      printers: [],
      detail: "Printer enumeration is only supported on Windows.",
    };
  }

  const ps = windowsPowerShellExe();
  const script =
    "Get-CimInstance -ClassName Win32_Printer -ErrorAction Stop | Select-Object -ExpandProperty Name";
  const r = spawnSync(ps, ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    windowsHide: true,
  });

  if (r.error) {
    const msg = r.error.message;
    return { code: "GETPRINTERS_THREW", printers: [], detail: msg };
  }

  const stderr = (r.stderr ?? "").trim();
  const stdout = r.stdout ?? "";
  const printers = parsePrinterLines(stdout);

  if (r.status !== 0) {
    const msg = [stderr || `exit ${r.status}`, stdout.trim().slice(0, 200)].filter(Boolean).join(" | ");
    return { code: "GETPRINTERS_THREW", printers: [], detail: msg };
  }

  // Fallback when Win32_Printer returns nothing but queues exist (rare WMI issues)
  if (printers.length === 0) {
    const altScript = "Get-Printer -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name";
    const r2 = spawnSync(ps, ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", altScript], {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
    });
    if (!r2.error && r2.status === 0) {
      const alt = parsePrinterLines(r2.stdout ?? "");
      if (alt.length > 0) {
        return { code: "OK", printers: alt };
      }
    }
  }

  return { code: "OK", printers };
}

/**
 * Returns the list of available printer names from the OS.
 * If enumeration fails, returns [] (backward compatible).
 */
export function getAvailablePrinters(): string[] {
  return enumerateWindowsPrinters().printers;
}
