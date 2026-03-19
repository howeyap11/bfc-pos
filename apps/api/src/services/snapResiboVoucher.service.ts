/**
 * SnapResibo voucher allocation and import.
 * Vouchers: AVAILABLE → ISSUED (at receipt) → USED (when redeemed elsewhere).
 *
 * BUSINESS RULE (strict):
 * - Only 1 SnapResibo voucher may ever be issued per transaction.
 * - Allocation happens ONLY at transaction finalization (when status becomes PAID). Never during print/reprint.
 * - All print/reprint flows must look up the voucher already linked to the transaction (getVouchersForTransaction)
 *   and reuse it. If none found, do not allocate; fail gracefully (caller sets snapResiboError).
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

/** Remaining = AVAILABLE, used = USED, total = all vouchers for the store. For settings UI stats and low-stock warning. */
export async function getVoucherStats(
  prisma: PrismaClient,
  storeId: string = STORE_ID
): Promise<{ remaining: number; used: number; total: number }> {
  const [remaining, used, total] = await Promise.all([
    prisma.snapResiboVoucher.count({ where: { storeId, status: "AVAILABLE" } }),
    prisma.snapResiboVoucher.count({ where: { storeId, status: "USED" } }),
    prisma.snapResiboVoucher.count({ where: { storeId } }),
  ]);
  return { remaining, used, total };
}

export type AllocateResult = { voucherId: string; pricePhp: number } | null;

export type VoucherForTransaction = { voucherId: string; source: string | null };

/**
 * Load already-issued SnapResibo vouchers linked to this transaction. Use for print/reprint; never allocates.
 */
export async function getVouchersForTransaction(
  prisma: PrismaClient,
  transactionId: string
): Promise<VoucherForTransaction[]> {
  const rows = await prisma.snapResiboVoucher.findMany({
    where: { transactionId, status: "ISSUED" },
    orderBy: { issuedAt: "asc" },
    select: { voucherId: true, source: true },
  });
  return rows.map((r) => ({ voucherId: r.voucherId, source: r.source }));
}

export type AllocateForTransactionOpts = {
  storeId?: string;
  transactionId: string;
  receiptNo: number;
  hasPaidSnapResiboLine: boolean;
  qualifiesReward: boolean;
  pricePhp: number;
};

export type AllocateForTransactionResult = {
  vouchers: AllocateResult[];
  error: string | null;
};

/**
 * Allocate at most ONE voucher for this transaction, only if it has none yet.
 * Call once at finalization (when transaction becomes PAID). Idempotent: if transaction
 * already has a linked voucher, returns it without allocating again.
 */
export async function allocateVouchersForTransaction(
  prisma: PrismaClient,
  opts: AllocateForTransactionOpts
): Promise<AllocateForTransactionResult> {
  const existing = await getVouchersForTransaction(prisma, opts.transactionId);
  if (existing.length > 0) {
    const pricePhp = opts.pricePhp;
    const vouchers: AllocateResult[] = existing.slice(0, 1).map((v) => ({
      voucherId: v.voucherId,
      pricePhp: v.source === "PAID_ITEM" ? pricePhp : 0,
    }));
    return { vouchers, error: null };
  }
  const storeId = opts.storeId ?? STORE_ID;
  if (opts.hasPaidSnapResiboLine) {
    const v = await allocateOneForPaidItem(prisma, {
      storeId,
      transactionId: opts.transactionId,
      receiptNo: opts.receiptNo,
      pricePhp: opts.pricePhp,
    });
    return { vouchers: v ? [v] : [], error: v ? null : "NO_AVAILABLE_VOUCHERS" };
  }
  if (opts.qualifiesReward) {
    const v = await allocateOneForReward(prisma, {
      storeId,
      transactionId: opts.transactionId,
      receiptNo: opts.receiptNo,
    });
    return { vouchers: v ? [v] : [], error: v ? null : "NO_AVAILABLE_VOUCHERS" };
  }
  return { vouchers: [], error: null };
}

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
