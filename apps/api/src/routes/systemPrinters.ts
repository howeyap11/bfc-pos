import type { FastifyInstance } from "fastify";
import { requireStaffHook } from "../plugins/staffGuard";
import { getAvailablePrinters } from "../services/printerDiscovery.service";
import { getPrinterConfig, setPrinterConfig } from "../services/printerConfig.service";
import { printTestReceiptToDevice, printTestStickerToDevice } from "../services/print.service";

export async function systemPrintersRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireStaffHook);

  app.get("/system/printers/available", async () => {
    const printers = getAvailablePrinters();
    return { printers };
  });

  app.get("/system/printers", async () => {
    const config = await getPrinterConfig();
    return config;
  });

  app.post("/system/printers", async (req, reply) => {
    const body = req.body as {
      receiptPrinter?: string;
      stickerPrinter?: string;
      stickerWidthMm?: number;
      stickerHeightMm?: number;
    };
    const config = await getPrinterConfig();
    await setPrinterConfig({
      receiptPrinter: body.receiptPrinter ?? config.receiptPrinter,
      stickerPrinter: body.stickerPrinter ?? config.stickerPrinter,
      stickerWidthMm: body.stickerWidthMm !== undefined ? Number(body.stickerWidthMm) : config.stickerWidthMm,
      stickerHeightMm: body.stickerHeightMm !== undefined ? Number(body.stickerHeightMm) : config.stickerHeightMm,
    });
    return getPrinterConfig();
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
