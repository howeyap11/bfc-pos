/**
 * SnapResibo voucher import and count. No admin PIN; visible only when SnapResibo is enabled.
 * Import: POST body JSON { voucherIds: string[] }. Client parses CSV/Excel and sends IDs (can send raw rows; invalid are counted).
 */

import type { FastifyInstance } from "fastify";
import {
  importVouchers,
  getVoucherStats,
  SnapResiboImportStoreNotFoundError,
  SNAPRESIBO_DEFAULT_STORE_ID,
} from "../services/snapResiboVoucher.service";

export async function snapResiboRoutes(app: FastifyInstance) {
  app.get("/snapresibo/vouchers/count", async () => {
    const stats = await getVoucherStats(app.prisma, SNAPRESIBO_DEFAULT_STORE_ID);
    return {
      count: stats.remaining,
      remaining: stats.remaining,
      used: stats.used,
      total: stats.total,
    };
  });

  app.post("/snapresibo/vouchers/import", async (req, reply) => {
    const body = req.body as { voucherIds?: unknown[] } | undefined;
    if (!body || !Array.isArray(body.voucherIds)) {
      reply.code(400);
      return { error: "MISSING_VOUCHER_IDS", message: "Body must be { voucherIds: string[] }" };
    }
    const voucherIds = body.voucherIds.map((id) => String(id).trim()).filter((id) => id.length > 0);

    if (voucherIds.length === 0) {
      return {
        imported: 0,
        skippedDuplicates: 0,
        skippedExisting: 0,
        invalidRows: 0,
        added: 0,
        skipped: 0,
        errors: [],
        message: "No voucher IDs provided",
      };
    }

    try {
      const result = await importVouchers(app.prisma, {
        storeId: SNAPRESIBO_DEFAULT_STORE_ID,
        voucherIds,
      });
      return {
        imported: result.imported,
        skippedDuplicates: result.skippedDuplicates,
        skippedExisting: result.skippedExisting,
        invalidRows: result.invalidRows,
        added: result.added,
        skipped: result.skipped,
        errors: result.errors,
      };
    } catch (err) {
      if (err instanceof SnapResiboImportStoreNotFoundError) {
        reply.code(404);
        return {
          error: err.code,
          message: err.message,
        };
      }
      throw err;
    }
  });
}
