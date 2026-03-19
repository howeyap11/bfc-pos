/**
 * SnapResibo voucher allocation and import.
 * Vouchers: AVAILABLE → ISSUED (at receipt) → USED (when redeemed elsewhere).
 */

import type { PrismaClient } from "@prisma/client";

/** Default store id; must match a row in Store table (e.g. created by seed). */
export const SNAPRESIBO_DEFAULT_STORE_ID = "store_1";
const STORE_ID = SNAPRESIBO_DEFAULT_STORE_ID;

const VOUCHER_ID_PREFIX = "VCHR_";
const MIN_VOUCHER_ID_LENGTH = 10;

export function isVoucherIdValid(voucherId: string): boolean {
  const s = String(voucherId).trim();
  return s.startsWith(VOUCHER_ID_PREFIX) && s.length >= MIN_VOUCHER_ID_LENGTH;
}

export async function getAvailableCount(prisma: PrismaClient, storeId: string = STORE_ID): Promise<number> {
  return prisma.snapResiboVoucher.count({
    where: { storeId, status: "AVAILABLE" },
  });
}

export type AllocateResult = { voucherId: string; pricePhp: number } | null;

/**
 * Allocate one available voucher for a paid SnapResibo QR item. Marks as ISSUED and links to transaction.
 */
export async function allocateOneForPaidItem(
  prisma: PrismaClient,
  opts: { storeId?: string; transactionId: string; receiptNo: number; pricePhp: number }
): Promise<AllocateResult> {
  const storeId = opts.storeId ?? STORE_ID;
  const next = await prisma.snapResiboVoucher.findFirst({
    where: { storeId, status: "AVAILABLE" },
    orderBy: { voucherId: "asc" },
  });
  if (!next) return null;
  await prisma.snapResiboVoucher.update({
    where: { id: next.id },
    data: {
      status: "ISSUED",
      source: "PAID_ITEM",
      transactionId: opts.transactionId,
      receiptNo: opts.receiptNo,
      issuedAt: new Date(),
    },
  });
  return { voucherId: next.voucherId, pricePhp: opts.pricePhp };
}

/**
 * Allocate one available voucher for a free reward (order total >= reward minimum). Marks as ISSUED.
 */
export async function allocateOneForReward(
  prisma: PrismaClient,
  opts: { storeId?: string; transactionId: string; receiptNo: number }
): Promise<AllocateResult> {
  const storeId = opts.storeId ?? STORE_ID;
  const next = await prisma.snapResiboVoucher.findFirst({
    where: { storeId, status: "AVAILABLE" },
    orderBy: { voucherId: "asc" },
  });
  if (!next) return null;
  await prisma.snapResiboVoucher.update({
    where: { id: next.id },
    data: {
      status: "ISSUED",
      source: "REWARD",
      transactionId: opts.transactionId,
      receiptNo: opts.receiptNo,
      issuedAt: new Date(),
    },
  });
  return { voucherId: next.voucherId, pricePhp: 0 };
}

export type ImportResult = {
  imported: number;
  skippedDuplicates: number;
  skippedExisting: number;
  invalidRows: number;
  errors: string[];
  added: number;
  skipped: number;
};

export class SnapResiboImportStoreNotFoundError extends Error {
  readonly code = "SNAPRESIBO_IMPORT_STORE_NOT_FOUND";
  constructor(storeId: string) {
    super(`Store not found: ${storeId}. Run seed or ensure Store row exists (e.g. id = "store_1").`);
    this.name = "SnapResiboImportStoreNotFoundError";
  }
}

/**
 * Import voucher IDs from parsed rows. Validates VCHR_* format; skips in-file duplicates and existing DB rows.
 * Throws SnapResiboImportStoreNotFoundError if the store does not exist (FK would fail).
 */
export async function importVouchers(
  prisma: PrismaClient,
  opts: { storeId?: string; voucherIds: string[] }
): Promise<ImportResult> {
  const storeId = opts.storeId ?? STORE_ID;
  const errors: string[] = [];
  let invalidRows = 0;
  let skippedDuplicates = 0;
  let skippedExisting = 0;

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { id: true },
  });
  if (!store) {
    throw new SnapResiboImportStoreNotFoundError(storeId);
  }

  const toCreate: { storeId: string; voucherId: string }[] = [];
  const seen = new Set<string>();

  for (const raw of opts.voucherIds) {
    const id = String(raw).trim();
    if (!id) {
      invalidRows++;
      continue;
    }
    if (!isVoucherIdValid(id)) {
      invalidRows++;
      continue;
    }
    if (seen.has(id)) {
      skippedDuplicates++;
      continue;
    }
    seen.add(id);
    const existing = await prisma.snapResiboVoucher.findUnique({
      where: { storeId_voucherId: { storeId, voucherId: id } },
    });
    if (existing) {
      skippedExisting++;
      continue;
    }
    toCreate.push({ storeId, voucherId: id });
  }

  let imported = 0;
  if (toCreate.length > 0) {
    try {
      // SQLite does not support skipDuplicates; we already filtered duplicates above (seen + findUnique).
      const result = await prisma.snapResiboVoucher.createMany({
        data: toCreate.map((r) => ({ ...r, status: "AVAILABLE", source: "IMPORT" })),
      });
      imported = result.count;
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string; meta?: unknown };
      const msg = e?.message ?? String(err);
      const code = e?.code ?? "(no code)";
      const meta = e?.meta ?? "(no meta)";
      if (typeof console !== "undefined" && console.error) {
        console.error("[SnapResibo import] createMany failed:", { message: msg, code, meta });
      }
      errors.push(`Import failed: ${msg}`);
      throw err;
    }
  }

  return {
    imported,
    skippedDuplicates,
    skippedExisting,
    invalidRows,
    errors,
    added: imported,
    skipped: skippedDuplicates + skippedExisting,
  };
}
