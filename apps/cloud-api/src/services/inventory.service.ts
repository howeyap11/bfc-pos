/**
 * Inventory service: append-only ledger, stock calculation, movement posting.
 * - Stock = SUM(quantityDeltaBaseUnit) per ingredient + location
 * - Idempotent sale deduction via sourceType + sourceId
 * - No silent overwrite; corrections use reversing entries
 *
 * Staff manual counts (SyncedInventoryCountSession via sync) carry shiftType + businessDate for daily
 * beginning/end audit. Future: tie POS inventory reports to those sessions (variance / prior-day basis).
 */
import type { PrismaClient, StockMovementType } from "@prisma/client";

export class InventoryService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Compute current stock for an ingredient at a location.
   */
  async getStock(params: {
    ingredientId: string;
    locationId: string;
  }): Promise<number> {
    const movements = await this.prisma.stockMovement.findMany({
      where: {
        ingredientId: params.ingredientId,
        locationId: params.locationId,
      },
      select: { quantityDeltaBaseUnit: true },
    });
    let total = 0;
    for (const m of movements) {
      total += Number(m.quantityDeltaBaseUnit);
    }
    return total;
  }

  /**
   * Compute stock for all ingredients across all locations.
   * Returns Map<"ingredientId:locationId", number>
   */
  async getStockByIngredientLocation(): Promise<Map<string, number>> {
    const movements = await this.prisma.stockMovement.findMany({
      select: {
        ingredientId: true,
        locationId: true,
        quantityDeltaBaseUnit: true,
      },
    });
    const map = new Map<string, number>();
    for (const m of movements) {
      const key = `${m.ingredientId}:${m.locationId}`;
      const qty = Number(m.quantityDeltaBaseUnit);
      map.set(key, (map.get(key) ?? 0) + qty);
    }
    return map;
  }

  /**
   * Post a single movement. Append-only; no deletion.
   * For idempotency: check sourceType+sourceId before insert.
   */
  async postMovement(params: {
    ingredientId: string;
    locationId: string;
    movementType: StockMovementType;
    quantityDeltaBaseUnit: number | string;
    sourceType?: string | null;
    sourceId?: string | null;
    actorStaffId?: string | null;
    approvedByStaffId?: string | null;
    notes?: string | null;
    businessDate?: Date | null;
  }) {
    const delta = Number(params.quantityDeltaBaseUnit);
    if (Number.isNaN(delta)) {
      throw new Error(`Invalid quantityDeltaBaseUnit: ${params.quantityDeltaBaseUnit}`);
    }

    if (params.sourceType && params.sourceId) {
      const existing = await this.prisma.stockMovement.findFirst({
        where: {
          sourceType: params.sourceType,
          sourceId: params.sourceId,
        },
      });
      if (existing) {
        return existing;
      }
    }

    return this.prisma.stockMovement.create({
      data: {
        ingredientId: params.ingredientId,
        locationId: params.locationId,
        movementType: params.movementType,
        quantityDeltaBaseUnit: delta,
        sourceType: params.sourceType ?? null,
        sourceId: params.sourceId ?? null,
        actorStaffId: params.actorStaffId ?? null,
        approvedByStaffId: params.approvedByStaffId ?? null,
        notes: params.notes ?? null,
        businessDate: params.businessDate ?? null,
      },
    });
  }

  /**
   * Post sale deductions. Idempotent by sourceType=SALE_DEDUCTION + sourceId (= POS sourceTransactionId).
   * When POS sends frozen per-line consumption, cloud applies those quantities here without recomputing recipes.
   */
  async postSaleDeductions(params: {
    locationId: string;
    sourceId: string;
    deductions: Array<{ ingredientId: string; quantityBaseUnit: number }>;
    actorStaffId?: string | null;
  }) {
    const { locationId, sourceId, deductions, actorStaffId } = params;
    const sourceType = "SALE_DEDUCTION";

    const existing = await this.prisma.stockMovement.findFirst({
      where: { sourceType, sourceId },
    });
    if (existing) return;

    if (deductions.length === 0) {
      const anchor = await this.prisma.ingredient.findFirst({
        where: { isActive: true },
        orderBy: { id: "asc" },
        select: { id: true },
      });
      if (!anchor) return;
      await this.prisma.stockMovement.create({
        data: {
          ingredientId: anchor.id,
          locationId,
          movementType: "SALE_DEDUCTION",
          quantityDeltaBaseUnit: 0,
          sourceType,
          sourceId,
          actorStaffId: actorStaffId ?? null,
          notes: "SALE_DEDUCTION anchor (zero consumption; refund/void can key off sale processed)",
        },
      });
      return;
    }

    await this.prisma.$transaction(
      deductions.map((d) =>
        this.prisma.stockMovement.create({
          data: {
            ingredientId: d.ingredientId,
            locationId,
            movementType: "SALE_DEDUCTION",
            quantityDeltaBaseUnit: -Math.abs(d.quantityBaseUnit),
            sourceType,
            sourceId,
            actorStaffId: actorStaffId ?? null,
          },
        })
      )
    );
  }

  /**
   * Idempotent positive ledger rows (e.g. REVERSAL returning stock). Same sourceType+sourceId
   * as sale deductions: first existing row short-circuits the whole batch.
   */
  async postIdempotentPositiveMovements(params: {
    locationId: string;
    sourceType: string;
    sourceId: string;
    movementType: StockMovementType;
    lines: Array<{ ingredientId: string; quantityBaseUnit: number }>;
    actorStaffId?: string | null;
  }) {
    const { locationId, sourceType, sourceId, movementType, lines, actorStaffId } = params;
    if (lines.length === 0) return;

    const existing = await this.prisma.stockMovement.findFirst({
      where: { sourceType, sourceId },
    });
    if (existing) return;

    await this.prisma.$transaction(
      lines.map((line) =>
        this.prisma.stockMovement.create({
          data: {
            ingredientId: line.ingredientId,
            locationId,
            movementType,
            quantityDeltaBaseUnit: Math.abs(line.quantityBaseUnit),
            sourceType,
            sourceId,
            actorStaffId: actorStaffId ?? null,
          },
        })
      )
    );
  }

  /**
   * Idempotent 0-qty row so refund/void paths that compute zero restore still mark sourceType+sourceId as processed.
   */
  async postIdempotentLedgerAnchorForZeroLines(params: {
    locationId: string;
    sourceType: string;
    sourceId: string;
    movementType: StockMovementType;
    actorStaffId?: string | null;
    notes?: string | null;
  }) {
    const { locationId, sourceType, sourceId, movementType, actorStaffId, notes } = params;
    const existing = await this.prisma.stockMovement.findFirst({
      where: { sourceType, sourceId },
    });
    if (existing) return;
    const anchor = await this.prisma.ingredient.findFirst({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true },
    });
    if (!anchor) return;
    await this.prisma.stockMovement.create({
      data: {
        ingredientId: anchor.id,
        locationId,
        movementType,
        quantityDeltaBaseUnit: 0,
        sourceType,
        sourceId,
        actorStaffId: actorStaffId ?? null,
        notes: notes ?? "Ledger anchor (zero-qty reversal)",
      },
    });
  }

  /**
   * Post transfer: TRANSFER_OUT at fromLocation, TRANSFER_IN at toLocation.
   */
  async postTransfer(params: {
    lines: Array<{ ingredientId: string; quantityBase: number }>;
    fromLocationId: string;
    toLocationId: string;
    sourceId: string;
    approvedByStaffId?: string | null;
  }) {
    const { lines, fromLocationId, toLocationId, sourceId, approvedByStaffId } =
      params;

    const outSourceType = "TRANSFER";
    const existing = await this.prisma.stockMovement.findFirst({
      where: {
        sourceType: outSourceType,
        sourceId,
      },
    });
    if (existing) return;

    await this.prisma.$transaction(
      lines.flatMap((line) => [
        this.prisma.stockMovement.create({
          data: {
            ingredientId: line.ingredientId,
            locationId: fromLocationId,
            movementType: "TRANSFER_OUT",
            quantityDeltaBaseUnit: -Math.abs(line.quantityBase),
            sourceType: outSourceType,
            sourceId,
            approvedByStaffId,
          },
        }),
        this.prisma.stockMovement.create({
          data: {
            ingredientId: line.ingredientId,
            locationId: toLocationId,
            movementType: "TRANSFER_IN",
            quantityDeltaBaseUnit: Math.abs(line.quantityBase),
            sourceType: outSourceType,
            sourceId,
            approvedByStaffId,
          },
        }),
      ])
    );
  }

  /**
   * Dev-only stock correction: one MANUAL_ADJUSTMENT movement so ledger matches target qty.
   * Does not touch sales/refund sources; append-only ledger.
   */
  async postDevManualSetQuantity(params: {
    ingredientId: string;
    locationId: string;
    targetQtyBase: number;
    sourceId: string;
    notes?: string | null;
  }) {
    const current = await this.getStock({
      ingredientId: params.ingredientId,
      locationId: params.locationId,
    });
    const delta = params.targetQtyBase - current;
    if (delta === 0) {
      return { skipped: true as const, current };
    }
    const row = await this.postMovement({
      ingredientId: params.ingredientId,
      locationId: params.locationId,
      movementType: "MANUAL_ADJUSTMENT",
      quantityDeltaBaseUnit: delta,
      sourceType: "DEV_MANUAL_SET",
      sourceId: params.sourceId,
      notes:
        params.notes ??
        `Dev manual set (correction): ledger was ${current}, target ${params.targetQtyBase}`,
    });
    return { skipped: false as const, current, movement: row };
  }

  /**
   * Post reconciliation variance. One movement per ingredient at location.
   */
  async postReconciliationVariance(params: {
    locationId: string;
    sourceId: string;
    lines: Array<{
      ingredientId: string;
      varianceQtyBase: number;
    }>;
    approvedByStaffId?: string | null;
  }) {
    const { locationId, sourceId, lines, approvedByStaffId } = params;
    const sourceType = "RECONCILIATION";

    const existing = await this.prisma.stockMovement.findFirst({
      where: { sourceType, sourceId },
    });
    if (existing) return;

    await this.prisma.$transaction(
      lines.map((line) =>
        this.prisma.stockMovement.create({
          data: {
            ingredientId: line.ingredientId,
            locationId,
            movementType: "RECONCILIATION_VARIANCE",
            quantityDeltaBaseUnit: line.varianceQtyBase,
            sourceType,
            sourceId,
            approvedByStaffId,
          },
        })
      )
    );
  }
}

export function createInventoryService(prisma: PrismaClient): InventoryService {
  return new InventoryService(prisma);
}
