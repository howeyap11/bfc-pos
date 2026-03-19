import type { FastifyInstance } from "fastify";
import { requireStaffHook } from "../plugins/staffGuard";
import { enumerateWindowsPrinters } from "../services/printerDiscovery.service";
import { getPrinterConfig, setPrinterConfig, type PrinterConfig } from "../services/printerConfig.service";
import { printTestReceiptToDevice, printTestStickerToDevice } from "../services/print.service";
import {
  resolveExactOrCaseInsensitive,
  resolveStickerQueueName,
  trimPrinterName,
} from "../services/printerResolve.service";

function enumerationHint(code: string, printerCount: number, detail?: string): string {
  if (code === "OK" && printerCount === 0) {
    return "Windows returned no printer queues. Check Printers & scanners and that the Print Spooler service is running.";
  }
  if (code === "NATIVE_MISSING") {
    return "Printer list unavailable. On Windows, ensure PowerShell works and the Print Spooler service is running.";
  }
  if (code === "MODULE_LOAD_FAILED") {
    return `Printer module failed to load: ${detail ?? "unknown error"}`;
  }
  if (code === "GETPRINTERS_THREW") {
    return `Windows printer enumeration failed: ${detail ?? "unknown"}`;
  }
  if (code === "NON_ARRAY") {
    return "Printer driver returned an unexpected response (not a printer list).";
  }
  return "";
}

function stickerResolvedQueue(
  s: ReturnType<typeof resolveStickerQueueName>
): string | null {
  if (
    s.kind === "none" ||
    s.kind === "ambiguous_ci" ||
    s.kind === "ambiguous_contains"
  ) {
    return null;
  }
  return s.queueName;
}

async function buildPrinterSettingsPayload(app: FastifyInstance, logCompare: boolean) {
  const config = await getPrinterConfig();
  const enumResult = enumerateWindowsPrinters();
  const names = enumResult.printers;
  const receiptRes = resolveExactOrCaseInsensitive(config.receiptPrinter, names);
  const receiptQueue =
    receiptRes.kind === "exact_trim" || receiptRes.kind === "case_insensitive"
      ? receiptRes.queueName
      : null;
  const stickerRes = resolveStickerQueueName(config.stickerPrinter, names, receiptQueue);
  const stickerQueue = stickerResolvedQueue(stickerRes);

  const receiptSelect =
    receiptRes.kind === "exact_trim" || receiptRes.kind === "case_insensitive"
      ? receiptRes.queueName
      : "";
  const stickerSelect = stickerQueue ?? "";

  if (logCompare) {
    app.log.info(
      {
        event: "printer_config_compare",
        enumerationCode: enumResult.code,
        windowsPrinterNamesExact: names,
        receiptConfigured: config.receiptPrinter,
        stickerConfigured: config.stickerPrinter,
        receiptResolution: receiptRes,
        stickerResolution: stickerRes,
        receiptSelectValue: receiptSelect,
        stickerSelectValue: stickerSelect,
        receiptVsWindowsExact:
          config.receiptPrinter !== "" &&
          names.some((n) => n === trimPrinterName(config.receiptPrinter)),
        stickerVsWindowsExact:
          config.stickerPrinter !== "" &&
          names.some((n) => n === trimPrinterName(config.stickerPrinter)),
      },
      "[BFC_PRINTER] Config vs Windows queues"
    );
  }

  return {
    ...config,
    enumeration: {
      ok: enumResult.code === "OK",
      code: enumResult.code,
      printerCount: names.length,
      windowsPrinterNamesExact: names,
      hint: enumerationHint(enumResult.code, names.length, enumResult.detail),
      detail: enumResult.detail,
    },
    receiptMatch: {
      configured: config.receiptPrinter,
      resolvedQueueName: receiptQueue,
      strategy: receiptRes.kind,
      ambiguousCandidates:
        receiptRes.kind === "ambiguous_ci" ? receiptRes.candidates : undefined,
    },
    stickerMatch: {
      configured: config.stickerPrinter,
      resolvedQueueName: stickerQueue,
      strategy: stickerRes.kind,
      ambiguousCandidates:
        stickerRes.kind === "ambiguous_ci" || stickerRes.kind === "ambiguous_contains"
          ? stickerRes.candidates
          : undefined,
    },
    receiptPrinterSelectValue: receiptSelect,
    stickerPrinterSelectValue: stickerSelect,
    savedReceiptNotMatched:
      trimPrinterName(config.receiptPrinter).length > 0 && !receiptSelect,
    savedStickerNotMatched:
      trimPrinterName(config.stickerPrinter).length > 0 && !stickerSelect,
  };
}

export async function systemPrintersRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireStaffHook);

  app.get("/system/printers/available", async (_req, _reply) => {
    const enumResult = enumerateWindowsPrinters();
    app.log.info(
      {
        event: "printer_enumeration",
        code: enumResult.code,
        printerCount: enumResult.printers.length,
        windowsPrinterNamesExact: enumResult.printers,
        detail: enumResult.detail,
      },
      "[BFC_PRINTER] Windows enumeration (GET /available)"
    );
    return {
      printers: enumResult.printers,
      enumeration: {
        ok: enumResult.code === "OK",
        code: enumResult.code,
        printerCount: enumResult.printers.length,
        hint: enumerationHint(enumResult.code, enumResult.printers.length, enumResult.detail),
        detail: enumResult.detail,
      },
    };
  });

  app.get("/system/printers", async (_req, _reply) => {
    return buildPrinterSettingsPayload(app, true);
  });

  app.post("/system/printers", async (req, reply) => {
    const body = req.body as {
      receiptPrinter?: string;
      stickerPrinter?: string;
      stickerWidthMm?: number;
      stickerHeightMm?: number;
    };
    const config = await getPrinterConfig();
    const next: PrinterConfig = {
      receiptPrinter: body.receiptPrinter ?? config.receiptPrinter,
      stickerPrinter: body.stickerPrinter ?? config.stickerPrinter,
      stickerWidthMm: body.stickerWidthMm !== undefined ? Number(body.stickerWidthMm) : config.stickerWidthMm,
      stickerHeightMm: body.stickerHeightMm !== undefined ? Number(body.stickerHeightMm) : config.stickerHeightMm,
    };
    await setPrinterConfig(next);
    return buildPrinterSettingsPayload(app, true);
  });

  app.post("/system/printers/test-receipt", async (req, reply) => {
    try {
      await printTestReceiptToDevice();
      return { ok: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err ?? "Print failed");
      reply.code(500);
      return { error: "PRINT_FAILED", message };
    }
  });

  app.post("/system/printers/test-sticker", async (req, reply) => {
    try {
      await printTestStickerToDevice();
      return { ok: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Print failed";
      reply.code(500);
      return { error: "PRINT_FAILED", message };
    }
  });
}
