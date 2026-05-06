// apps/api/src/routes/posTransactions.ts
//
// RegisterSession Enforcement: DISABLED
// ========================================
// TODO: RegisterSession enforcement disabled until cash reconciliation module is implemented.
// Staff login (cashier PIN) is sufficient for auditing.
// When cash reconciliation is ready, re-enable the NO_OPEN_REGISTER check in POST /pos/transactions.
//
import type { FastifyInstance, FastifyReply } from "fastify";
import { Prisma, type MilkType, type ServiceType, type ShotsPricingMode } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { requireStaffHook } from "../plugins/staffGuard";
import { verifyAdminPin } from "../services/adminPin.service";
import { enqueueOutbox } from "../services/outbox.service";
import { ensureItemForCloudId } from "../services/catalogCache.service";
import { syncTransactionToCloudOrEnqueue } from "../services/transactionSync.service";
import {
  printReceiptToDevice,
  printStickersToDevice,
  printOrderSlip,
  formatTransactionLineLabel,
  filterOptionsJsonByItemCaps,
  type ReceiptHeaderOptions,
  type TransactionForPrint,
} from "../services/print.service";
import {
  allocateVouchersForTransaction,
  getSnapResiboVoucherForTransaction,
} from "../services/snapResiboVoucher.service";
import { getCalendarDayRange } from "../services/dayRange.service";
import { printZReading } from "../services/zReading.service";
import { getTransactionSummary } from "../services/transactionSummary.service";
import { getTransactionSyncOutboxStatus } from "../services/outbox.service";
import {
  finalizePaidTransactionInventory,
  restoreInventoryForRefund,
  restoreInventoryForVoid,
} from "../services/posTxnInventory.service";

const STORE_ID = "store_1";
const SNAPRESIBO_QR_ITEM_ID = "SNAPRESIBO_QR";

export const CREATE_TX_STEPS = {
  validate_input: "validate_input",
  ensure_store: "ensure_store",
  resolve_items: "resolve_items",
  build_line_snapshots: "build_line_snapshots",
  create_transaction: "create_transaction",
  create_audit_log: "create_audit_log",
} as const;
export type CreateTransactionStep = (typeof CREATE_TX_STEPS)[keyof typeof CREATE_TX_STEPS];

function getPrismaErrorInfo(err: unknown): { code?: string; meta?: unknown } {
  const e = err as { code?: string; meta?: unknown };
  return typeof e === "object" && e !== null ? { code: e.code, meta: e.meta } : {};
}

/** Reject cart lines whose baseType/size no longer match synced CloudMenuItemDrinkSizeConfig (offline catalog updates). */
async function assertDrinkSizeSelectionsAllowed(
  prisma: PrismaClient,
  storeId: string,
  log: FastifyInstance["log"],
  regularItems: Array<{
    itemId: string;
    baseType?: "HOT" | "ICED" | "CONCENTRATED";
    sizeLabel?: string;
    optionIds?: string[];
  }>
) {
  const sizedLines = regularItems.filter(
    (it) => it.baseType && it.sizeLabel != null && String(it.sizeLabel).trim() !== ""
  );
  if (sizedLines.length === 0) return;

  const cloudIds = [...new Set(sizedLines.map((i) => i.itemId))];
  const configs = await prisma.cloudMenuItemDrinkSizeConfig.findMany({
    where: { storeId, menuItemCloudId: { in: cloudIds } },
    select: { menuItemCloudId: true, mode: true, optionCloudId: true },
  });
  const configsByItem = new Map<string, typeof configs>();
  for (const c of configs) {
    const list = configsByItem.get(c.menuItemCloudId) ?? [];
    list.push(c);
    configsByItem.set(c.menuItemCloudId, list);
  }

  const allOptIds = [...new Set(configs.map((c) => c.optionCloudId))];
  const optRows =
    allOptIds.length > 0
      ? await prisma.cloudMenuOption.findMany({
          where: { storeId, cloudId: { in: allOptIds } },
          select: { cloudId: true, name: true },
        })
      : [];
  const optNameById = new Map(optRows.map((o) => [o.cloudId, o.name ?? ""]));

  const normLabel = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "");

  for (const it of sizedLines) {
    const itemCfgs = configsByItem.get(it.itemId) ?? [];
    if (itemCfgs.length === 0) continue;

    const mode = String(it.baseType ?? "").toUpperCase();
    const allowedIds = new Set(
      itemCfgs.filter((c) => String(c.mode ?? "").toUpperCase() === mode).map((c) => c.optionCloudId)
    );

    if (allowedIds.size === 0) {
      log.error(
        {
          tag: "[createTransaction]",
          step: CREATE_TX_STEPS.resolve_items,
          reason: "DRINK_MODE_NOT_ALLOWED",
          itemId: it.itemId,
          baseType: it.baseType,
          sizeLabel: it.sizeLabel,
          optionIds: it.optionIds ?? [],
        },
        "Cart drink selection invalid for synced menu"
      );
      throw new Error(
        `DRINK_MODE_NOT_ALLOWED itemId=${it.itemId} baseType=${it.baseType} sizeLabel=${it.sizeLabel ?? ""}`
      );
    }

    const lineOptIds = it.optionIds ?? [];
    if (lineOptIds.some((id) => allowedIds.has(id))) continue;

    const labelNorm = normLabel(String(it.sizeLabel ?? ""));
    let matched = false;
    for (const oid of allowedIds) {
      const nm = normLabel(optNameById.get(oid) ?? "");
      if (nm && (nm === labelNorm || nm.includes(labelNorm) || labelNorm.includes(nm))) {
        matched = true;
        break;
      }
    }
    if (!matched) {
      log.error(
        {
          tag: "[createTransaction]",
          step: CREATE_TX_STEPS.resolve_items,
          reason: "DRINK_SIZE_OPTION_NOT_ALLOWED_FOR_MODE",
          itemId: it.itemId,
          baseType: it.baseType,
          sizeLabel: it.sizeLabel,
          optionIds: lineOptIds,
          allowedOptionIdsForMode: [...allowedIds],
        },
        "Cart drink selection invalid for synced menu"
      );
      throw new Error(
        `DRINK_SIZE_NOT_ALLOWED itemId=${it.itemId} baseType=${it.baseType} sizeLabel=${it.sizeLabel ?? ""}`
      );
    }
  }
}

function logCreateTransactionError(
  log: FastifyInstance["log"],
  ctx: { storeId: string; transactionNo?: number; step: string; deviceId?: string },
  err: unknown,
  payload?: Record<string, unknown>
) {
  const prismaInfo = getPrismaErrorInfo(err);
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  log.error(
    {
      tag: "[createTransaction]",
      ...ctx,
      errorMessage: message,
      prismaCode: prismaInfo.code,
      prismaMeta: prismaInfo.meta,
      ...(payload ?? {}),
    },
    "Transaction create failed"
  );
  if (stack && process.env.NODE_ENV !== "production") {
    log.debug({ stack }, "createTransaction stack");
  }
}

/** Ensure Store and StoreConfig exist (same as seed). Required for transaction.create FK. */
async function ensureStoreAndConfig(prisma: PrismaClient) {
  await prisma.store.upsert({
    where: { id: STORE_ID },
    update: { code: "BFC-LOCAL", name: "But First, Coffee (Local)" },
    create: { id: STORE_ID, code: "BFC-LOCAL", name: "But First, Coffee (Local)" },
  });
  await prisma.storeConfig.upsert({
    where: { storeId: STORE_ID },
    update: {},
    create: {
      storeId: STORE_ID,
      enabledPaymentMethods: JSON.stringify(["CASH", "CARD", "GCASH", "FOODPANDA"]),
      splitPaymentEnabled: true,
      paymentMethodOrder: null,
    },
  });
}

const storeConfigReceiptSelect = {
  businessName: true,
  address: true,
  receiptTaxType: true,
  receiptNonVatTin: true,
  receiptVatTin: true,
  receiptBirMin: true,
  receiptBirSerialNo: true,
  snapResiboEnabled: true,
  snapResiboPriceCents: true,
  snapResiboRewardMinimumCents: true,
} as const;

function receiptHeaderFromStoreConfig(
  storeConfig: {
    businessName: string | null;
    address: string | null;
    receiptTaxType: string | null;
    receiptNonVatTin: string | null;
    receiptVatTin: string | null;
    receiptBirMin: string | null;
    receiptBirSerialNo: string | null;
  } | null
): ReceiptHeaderOptions | undefined {
  if (!storeConfig) return undefined;
  return {
    businessName: storeConfig.businessName ?? null,
    address: storeConfig.address ?? null,
    receiptTaxType: storeConfig.receiptTaxType ?? null,
    receiptNonVatTin: storeConfig.receiptNonVatTin ?? null,
    receiptVatTin: storeConfig.receiptVatTin ?? null,
    receiptBirMin: storeConfig.receiptBirMin ?? null,
    receiptBirSerialNo: storeConfig.receiptBirSerialNo ?? null,
  };
}

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}

function calculateShotsUpcharge(
  shotsQty: number,
  pricingMode: ShotsPricingMode | null | undefined,
  defaultShots?: number | null,
  shotRule?: { shotsPerBundle: number; priceCentsPerBundle: number } | null
): number {
  if (shotsQty === 0) return 0;

  // Cloud: use synced rule with default included shots (null defaultShots = 0 free)
  if (shotRule && defaultShots != null) {
    const defShots = typeof defaultShots === "number" ? defaultShots : 0;
    const extraShots = Math.max(0, shotsQty - defShots);
    if (extraShots === 0) return 0;
    const perBundle = shotRule.shotsPerBundle;
    if (typeof perBundle !== "number" || perBundle <= 0) return 0;
    const bundles = Math.ceil(extraShots / perBundle);
    const price = shotRule.priceCentsPerBundle;
    if (typeof price !== "number" || !Number.isFinite(bundles * price)) return 0;
    return bundles * price;
  }

  // Legacy: shotsPricingMode
  if (!pricingMode) return 0;
  if (pricingMode === "ESPRESSO_FREE2_PAIR40") {
    const extraShots = Math.max(0, shotsQty - 2);
    if (extraShots === 0) return 0;
    const chargedPairs = Math.ceil(extraShots / 2);
    return chargedPairs * 4000;
  }
  if (pricingMode === "PAIR40_NO_FREE") {
    const pairs = Math.ceil(shotsQty / 2);
    return pairs * 4000;
  }
  return 0;
}

function calculateMilkUpcharge(milkChoice: MilkType | undefined, defaultMilk: MilkType | undefined): number {
  if (defaultMilk == null) return 0; // No default from cloud; no milk upcharge
  const selectedMilk = milkChoice ?? defaultMilk;
  return selectedMilk !== defaultMilk ? 1000 : 0; // 1000 cents = ₱10
}

export async function posTransactionsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireStaffHook);

  // List recent transactions with pagination. Optional selectedDate (YYYY-MM-DD) filters by calendar day.
  const listTransactions = async (req: any) => {
    const query = req.query as { limit?: string; cursor?: string; selectedDate?: string };
    const limit = Math.min(parseInt(query.limit || "30") || 30, 100);
    const cursor = query.cursor ? parseInt(query.cursor) : null;
    const selectedDate = typeof query.selectedDate === "string" ? query.selectedDate.trim() : null;

    const dateRange =
      selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)
        ? getCalendarDayRange(selectedDate)
        : null;

    if (dateRange) {
      app.log.info(
        {
          event: "transactions_list_date_filter",
          selectedDate,
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString(),
        },
        "[Transactions] list with calendar-day filter"
      );
    }

    const whereClause: Record<string, unknown> = { storeId: STORE_ID };
    if (dateRange) {
      whereClause.createdAt = { gte: dateRange.from, lt: dateRange.toExclusive };
    }
    if (cursor != null) {
      whereClause.transactionNo = { lt: cursor };
    }

    const transactions = await app.prisma.transaction.findMany({
      where: whereClause,
      orderBy: { transactionNo: "desc" },
      take: limit + 1, // Fetch one extra to determine if there's a next page
      include: {
        lineItems: {
          include: {
            refundItems: true,
            item: {
              select: {
                cloudId: true,
                supportsShots: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        payments: true,
        table: { select: { label: true, zone: { select: { code: true } } } },
        refunds: {
          include: {
            refundItems: true,
          },
        },
      },
    });

    const hasMore = transactions.length > limit;
    const rawItems = hasMore ? transactions.slice(0, limit) : transactions;
    const nextCursor = hasMore ? rawItems[rawItems.length - 1].transactionNo : null;

    if (dateRange) {
      app.log.info({
        event: "transactions_list_loaded",
        selectedDate,
        fullDayCount: transactions.length,
        currentPageRowCount: rawItems.length,
        hasMore,
      });
    }

    const listCloudIds = new Set<string>();
    for (const tx of rawItems) {
      for (const li of tx.lineItems) {
        const cid = li.item?.cloudId;
        if (cid) listCloudIds.add(cid);
      }
    }
    const listCloudRows =
      listCloudIds.size > 0
        ? await app.prisma.cloudMenuItem.findMany({
            where: { storeId: STORE_ID, cloudId: { in: [...listCloudIds] } },
            select: { cloudId: true, name: true, hasSizes: true, supportsShots: true },
          })
        : [];
    const listCloudCapMap = new Map(listCloudRows.map((r) => [r.cloudId, r]));

    const items = rawItems.map((tx) => ({
      ...tx,
      lineItems: tx.lineItems.map((li) => {
        const cloudId = li.item?.cloudId ?? null;
        const cap = cloudId ? listCloudCapMap.get(cloudId) : undefined;
        const allowStructuredSize = cloudId ? cap?.hasSizes === true : true;
        const allowShots = cloudId ? cap?.supportsShots === true : li.item?.supportsShots !== false;
        const oj = filterOptionsJsonByItemCaps(li.optionsJson, { allowStructuredSize, allowShots });
        return {
          ...li,
          optionsJson: oj ?? li.optionsJson,
          displayLabel: formatTransactionLineLabel({
            name: li.name,
            optionsJson: oj,
            categoryName: li.categoryName ?? li.item?.category?.name ?? undefined,
            subCategoryName: li.subCategoryName ?? undefined,
            qty: li.qty,
            includeQuantity: true,
          }),
        };
      }),
    }));

    return {
      items,
      nextCursor,
      hasMore,
    };
  };

  app.get("/pos/transactions", listTransactions);
  app.get("/pos/transactions/list", listTransactions);

  /** Cloud sync outbox status for admin visibility (pending count, high-retry count). */
  app.get("/pos/transactions/sync-status", async () => {
    return getTransactionSyncOutboxStatus(app.prisma);
  });

  // Full-range summary for selected day (decoupled from pagination). Uses strict calendar day range.
  app.get("/pos/transactions/summary", async (req, reply) => {
    const query = req.query as { selectedDate?: string };
    const selectedDate = typeof query.selectedDate === "string" ? query.selectedDate.trim() : null;
    if (!selectedDate || !/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      reply.code(400);
      return { error: "INVALID_DATE", message: "selectedDate (YYYY-MM-DD) is required" };
    }

    try {
      const range = getCalendarDayRange(selectedDate);
      const summary = await getTransactionSummary(app.prisma, selectedDate);

      app.log.info(
        {
          event: "transactions_summary",
          selectedDate,
          from: range.from.toISOString(),
          to: range.to.toISOString(),
          transactionCount: summary.transactionCount,
          grossSalesCents: summary.grossSalesCents,
        },
        "[Transactions] summary loaded for selected date"
      );

      return summary;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err ?? "Summary failed");
      app.log.error({ err, selectedDate }, "[Transactions] summary failed");
      reply.code(500);
      return { error: "SUMMARY_FAILED", message };
    }
  });

  // Create transaction + line items (no payment yet)
  app.post("/pos/transactions", async (req, reply) => {
    const deviceId = (req.headers["x-device-id"] as string) || undefined;
    let step: CreateTransactionStep = CREATE_TX_STEPS.validate_input;

    type ItemInput = {
      itemId: string;
      qty: number;
      optionIds?: string[];
      note?: string;
      specialInstructions?: string;
      customerName?: string;
      baseType?: "HOT" | "ICED" | "CONCENTRATED";
      sizeLabel?: string;
      shotsQty?: number;
      milkChoice?: string;
      selectedSubstituteCloudId?: string;
      defaultMilk?: MilkType;
      surchargeCents?: number;
      discountPct?: number;
      discountAmount?: number;
      discountTag?: "SNR" | "PWD" | null;
    };
    type BodyInput = {
      tablePublicKey?: string;
      items?: ItemInput[];
      discountCents?: number;
      serviceType?: string;
      orderId?: string;
    };

    try {
      const rawBody = (req.body ?? {}) as BodyInput;
      const body: BodyInput & { items: ItemInput[] } = {
        ...rawBody,
        items: Array.isArray(rawBody.items) ? rawBody.items : [],
      };
      for (const it of body.items) {
        if (it && typeof it === "object") {
          if (!Array.isArray(it.optionIds)) {
            (it as ItemInput).optionIds = it.optionIds ?? [];
          }
          const idRaw = (it as ItemInput).itemId;
          (it as ItemInput).itemId =
            typeof idRaw === "string" ? idRaw.trim() : idRaw != null ? String(idRaw).trim() : "";
        }
      }

      if (body.items.length === 0) {
        reply.code(400);
        return { error: "EMPTY_ITEMS" };
      }
      if (body.items.some((it) => !it?.itemId)) {
        reply.code(400);
        return { error: "MISSING_ITEM_ID", message: "One or more lines are missing a valid item id." };
      }

      let orderIdForCreate: string | null = null;
      if (body.orderId != null && String(body.orderId).trim() !== "") {
        const oid = String(body.orderId).trim();
        const ord = await app.prisma.order.findUnique({
          where: { id: oid },
          select: { id: true },
        });
        if (!ord) {
          reply.code(400);
          return {
            error: "ORDER_NOT_FOUND",
            message: "Order not found. Reload QR orders or start a new cart.",
          };
        }
        const existingForOrder = await app.prisma.transaction.findUnique({
          where: { orderId: oid },
          select: { id: true },
        });
        if (existingForOrder) {
          reply.code(409);
          return {
            error: "ORDER_ALREADY_HAS_TRANSACTION",
            message: "This order is already linked to a sale. Open it from Transactions or start a new order.",
          };
        }
        orderIdForCreate = oid;
      }

      step = CREATE_TX_STEPS.ensure_store;
      // Ensure Store (and StoreConfig) exist so transaction.create FK does not fail (e.g. fresh DB without seed).
      await ensureStoreAndConfig(app.prisma);

    // TODO: RegisterSession enforcement disabled until cash reconciliation module is implemented.
    // Staff login (cashier PIN) is sufficient for auditing.
    // When cash reconciliation is ready, uncomment the check below and require an open register.
    
    // Find open register session (optional, for linking only)
    const open = await app.prisma.registerSession.findFirst({
      where: { storeId: STORE_ID, status: "OPEN" },
      orderBy: { openedAt: "desc" },
      select: { id: true },
    });
    // Enforcement disabled: transactions can proceed without an open register
    // if (!open) {
    //   reply.code(409);
    //   return { error: "NO_OPEN_REGISTER" };
    // }

    let tableId: string | null = null;
    if (body.tablePublicKey) {
      const table = await app.prisma.table.findUnique({
        where: { publicKey: body.tablePublicKey },
        select: { id: true },
      });
      if (!table) {
        reply.code(404);
        return { error: "TABLE_NOT_FOUND" };
      }
      tableId = table.id;
    }

    // SnapResibo: separate virtual item from regular catalog items
    const regularItems = body.items.filter((i) => i.itemId !== SNAPRESIBO_QR_ITEM_ID);
    const snapResiboItems = body.items.filter((i) => i.itemId === SNAPRESIBO_QR_ITEM_ID);
    const storeConfigForCreate = await app.prisma.storeConfig.findUnique({
      where: { storeId: STORE_ID },
      select: { snapResiboEnabled: true, snapResiboPriceCents: true, snapResiboRewardMinimumCents: true, devMode: true },
    });
    if (snapResiboItems.length > 0) {
      if (!storeConfigForCreate?.snapResiboEnabled) {
        reply.code(400);
        return { error: "SNAPRESIBO_DISABLED", message: "SnapResibo is disabled in Settings" };
      }
    }

    // transactionNo: same max+1 style as orderNo (store-scoped)
    const last = await app.prisma.transaction.findFirst({
      where: { storeId: STORE_ID },
      orderBy: { transactionNo: "desc" },
      select: { transactionNo: true },
    });
    const nextNo = (last?.transactionNo ?? 0) + 1;

    step = CREATE_TX_STEPS.resolve_items;
    // itemId from POS is menu cloudId or legacy Item.id; resolve to Item.id for storage + inventory (exclude SnapResibo virtual item)
    const cloudIds = [...new Set(regularItems.map((i) => i.itemId))];
    const optionIds = [...new Set(regularItems.flatMap((i) => i.optionIds ?? []))];

    const requestItemIdToLocalId = new Map<string, string>();
    for (const cid of cloudIds) {
      try {
        const localId = await ensureItemForCloudId(app.prisma, cid);
        requestItemIdToLocalId.set(cid, localId);
      } catch (cause) {
        const causeMsg = cause instanceof Error ? cause.message : String(cause);
        app.log.error(
          {
            tag: "[createTransaction]",
            step: CREATE_TX_STEPS.resolve_items,
            storeId: STORE_ID,
            deviceId,
            cloudItemId: cid,
            cause: causeMsg,
          },
          "ensureItemForCloudId failed (invalid or missing catalog item)"
        );
        throw new Error(`Invalid itemId: ${cid} (${causeMsg})`);
      }
    }

    const uniqueLocalIds = [...new Set(requestItemIdToLocalId.values())];
    const dbItems = await app.prisma.item.findMany({
      where: { id: { in: uniqueLocalIds } },
      select: {
        id: true,
        cloudId: true,
        name: true,
        basePrice: true,
        defaultMilk: true,
        shotsPricingMode: true,
        foodpandaSurchargeCents: true,
      },
    });
    // Map by both id and cloudId so we can look up from body itemId (cloudId)
    const itemMap = new Map<string, (typeof dbItems)[0]>();
    for (const i of dbItems) {
      itemMap.set(i.id, i);
      if (i.cloudId) itemMap.set(i.cloudId, i);
    }
    for (const [requestId, localId] of requestItemIdToLocalId) {
      const row = itemMap.get(localId);
      if (row) itemMap.set(requestId, row);
    }

    const cloudItems = await app.prisma.cloudMenuItem.findMany({
      where: { cloudId: { in: cloudIds }, storeId: STORE_ID },
      select: {
        cloudId: true,
        isDrink: true,
        serveVessel: true,
        defaultShots: true,
        defaultSubstituteCloudId: true,
        categoryCloudId: true,
        subCategoryCloudId: true,
        hasSizes: true,
        supportsShots: true,
      },
    });
    const cloudItemMap = new Map(cloudItems.map((c) => [c.cloudId, c]));

    const categoryCloudIds = [...new Set(cloudItems.map((c) => c.categoryCloudId).filter((id): id is string => !!id))];
    const subCategoryCloudIds = [...new Set(cloudItems.map((c) => c.subCategoryCloudId).filter((id): id is string => !!id))];
    const categoryNameByCloudId = new Map<string, string>();
    const subCategoryNameByCloudId = new Map<string, string>();
    if (categoryCloudIds.length > 0) {
      const categories = await app.prisma.cloudCategory.findMany({
        where: { cloudId: { in: categoryCloudIds }, storeId: STORE_ID },
        select: { cloudId: true, name: true },
      });
      for (const cat of categories) categoryNameByCloudId.set(cat.cloudId, cat.name);
    }
    if (subCategoryCloudIds.length > 0) {
      const subCats = await app.prisma.cloudSubCategory.findMany({
        where: { cloudId: { in: subCategoryCloudIds }, storeId: STORE_ID },
        select: { cloudId: true, name: true },
      });
      for (const sub of subCats) subCategoryNameByCloudId.set(sub.cloudId, sub.name);
    }

    const substituteIds = new Set<string>();
    body.items.forEach((it) => {
      if (it.selectedSubstituteCloudId) substituteIds.add(it.selectedSubstituteCloudId);
    });
    cloudItems.forEach((c) => {
      if (c.defaultSubstituteCloudId) substituteIds.add(c.defaultSubstituteCloudId);
    });
    const substituteRows =
      substituteIds.size > 0
        ? await app.prisma.cloudSubstitute.findMany({
            where: { cloudId: { in: [...substituteIds] }, storeId: STORE_ID },
            select: { cloudId: true, priceCents: true },
          })
        : [];
    const substitutePriceMap = new Map(substituteRows.map((s) => [s.cloudId, s.priceCents]));

    // Per-size/mode milk prices (e.g. 70 regular, 180 1-liter) for correct upcharge
    const substitutePriceRows =
      substituteIds.size > 0
        ? await app.prisma.cloudSubstitutePrice.findMany({
            where: { substituteCloudId: { in: [...substituteIds] }, storeId: STORE_ID },
            select: { substituteCloudId: true, sizeCloudId: true, mode: true, priceCents: true },
          })
        : [];
    const substitutePriceBySizeMap = new Map<string, number>();
    for (const p of substitutePriceRows) {
      const modeNorm = (p.mode ?? "").toUpperCase();
      substitutePriceBySizeMap.set(`${p.substituteCloudId}|${p.sizeCloudId}|${modeNorm}`, p.priceCents);
    }
    const sizeCloudIdsSet = new Set(substitutePriceRows.map((p) => p.sizeCloudId));
    // Map size label -> sizeCloudId so we can resolve price when line sends sizeLabel (e.g. "1-Liter") but option ids don't match
    const sizeLabelToCloudId = new Map<string, string>();
    if (sizeCloudIdsSet.size > 0) {
      const menuSizes = await app.prisma.cloudMenuSize.findMany({
        where: { cloudId: { in: [...sizeCloudIdsSet] }, storeId: STORE_ID },
        select: { cloudId: true, label: true },
      });
      for (const s of menuSizes) {
        const labelNorm = (s.label ?? "").trim().toLowerCase();
        if (labelNorm) sizeLabelToCloudId.set(labelNorm, s.cloudId);
      }
    }

    const dbOptions = await app.prisma.option.findMany({
      where: { id: { in: optionIds } },
      select: { id: true, name: true, priceDelta: true, group: { select: { name: true } } },
    });
    const optionMap = new Map(dbOptions.map((o) => [o.id, o]));

    const cloudOptions = await app.prisma.cloudMenuOption.findMany({
      where: { cloudId: { in: optionIds }, storeId: STORE_ID },
    });
    const cloudGroupIds = [...new Set(cloudOptions.map((o) => o.groupCloudId))];
    const cloudGroups = await app.prisma.cloudMenuOptionGroup.findMany({
      where: { cloudId: { in: cloudGroupIds }, storeId: STORE_ID },
      select: { cloudId: true, name: true },
    });
    const cloudGroupNameMap = new Map(cloudGroups.map((g) => [g.cloudId, g.name]));
    const cloudOptionMap = new Map(
      cloudOptions.map((o) => [
        o.cloudId,
        { name: o.name, priceDelta: o.priceDelta, groupName: cloudGroupNameMap.get(o.groupCloudId) ?? "" },
      ])
    );

    // Resolve add-on IDs (from CloudAddOn) so they get name/group in optionsJson for cart and sticker
    const foundOptionIds = new Set([...optionMap.keys(), ...cloudOptionMap.keys()]);
    const addOnIds = optionIds.filter((id) => !foundOptionIds.has(id));
    const cloudAddOns =
      addOnIds.length > 0
        ? await app.prisma.cloudAddOn.findMany({
            where: { cloudId: { in: addOnIds }, storeId: STORE_ID },
            select: { cloudId: true, name: true, priceCents: true },
          })
        : [];
    const addOnMap = new Map(cloudAddOns.map((a) => [a.cloudId, { name: a.name, priceDelta: a.priceCents }]));

    const discountCents = Math.max(0, Math.trunc(Number(body.discountCents ?? 0)));

    // Active shot pricing rule (for cloud items when Item.shotsPricingMode is null)
    const shotRuleRow = await app.prisma.cloudShotPricingRule.findFirst({
      where: { storeId: STORE_ID, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    const shotRule = shotRuleRow
      ? { shotsPerBundle: shotRuleRow.shotsPerBundle, priceCentsPerBundle: shotRuleRow.priceCentsPerBundle }
      : null;

    // Load per-size pricing for sized items (baseType + size selection); also used for included-shots lookup
    const sizedItems = body.items.filter((it) => it.baseType && it.sizeLabel);
    const sizePriceMap = new Map<string, number>();
    const includedShotsMap = new Map<string, number>();
    if (sizedItems.length > 0) {
      const sizedCloudIds = [...new Set(sizedItems.map((i) => i.itemId))];
      const sizePrices = await app.prisma.cloudMenuItemSizePrice.findMany({
        where: { storeId: STORE_ID, menuItemCloudId: { in: sizedCloudIds } },
        select: { menuItemCloudId: true, baseType: true, sizeCode: true, priceCents: true, includedShots: true },
      });
      for (const p of sizePrices) {
        const key = `${p.menuItemCloudId}|${p.baseType}|${p.sizeCode}`;
        sizePriceMap.set(key, p.priceCents);
        if (p.includedShots != null) {
          includedShotsMap.set(key, p.includedShots);
        }
      }
    }

    await assertDrinkSizeSelectionsAllowed(app.prisma, STORE_ID, app.log, regularItems);

    // Determine service type, source
    // NOTE: Service fees are now per-line (lineSurchargeCents), not transaction-level
    const serviceTypeInput = String(body.serviceType ?? "DINE_IN").trim().toUpperCase();
    let serviceType: ServiceType;
    let source: "POS" | "FOODPANDA";

    if (serviceTypeInput === "FOODPANDA" || serviceTypeInput === "FOOD_PANDA") {
      serviceType = "FOODPANDA" as ServiceType;
      source = "FOODPANDA";
    } else if (serviceTypeInput === "GRABFOOD" || serviceTypeInput === "GRAB_FOOD") {
      serviceType = "DELIVERY";
      source = "FOODPANDA";
    } else if (serviceTypeInput === "BFC_APP" || serviceTypeInput === "BFCAPP") {
      serviceType = "DELIVERY";
      source = "POS";
    } else if (serviceTypeInput === "DELIVERY") {
      serviceType = "DELIVERY";
      source = "FOODPANDA";
    } else if (
      serviceTypeInput === "TO_GO" ||
      serviceTypeInput === "TAKE_OUT" ||
      serviceTypeInput === "TAKEOUT"
    ) {
      serviceType = "TO_GO";
      source = "POS";
    } else {
      serviceType = "DINE_IN";
      source = "POS";
    }

    step = CREATE_TX_STEPS.build_line_snapshots;
    // Build line snapshots + totals (it.itemId is cloudId); only regular items
    type LineSnapshotCreate = {
      itemId: string | null;
      name: string;
      qty: number;
      unitPrice: number;
      modifiersCents: number;
      lineTotal: number;
      note: string | null;
      specialInstructions: string | null;
      customerName: string | null;
      optionsJson: string;
      isDrink: boolean | null;
      serveVessel: string | null;
      categoryName?: string;
      subCategoryName?: string;
    };
    const lineSnapshots: LineSnapshotCreate[] = regularItems.map((it) => {
      const dbItem = itemMap.get(it.itemId);
      if (!dbItem) throw new Error(`Invalid itemId: ${it.itemId}`);

      const cloudItemRow = cloudItemMap.get(it.itemId);
      const allowsSizes = cloudItemRow?.hasSizes === true;
      const allowsShots = cloudItemRow?.supportsShots === true;
      const effectiveBaseType = allowsSizes ? it.baseType : undefined;
      const effectiveSizeLabel = allowsSizes ? it.sizeLabel : undefined;
      const effectiveShotsQty = allowsShots ? Math.max(0, Math.trunc(it.shotsQty ?? 0)) : 0;

      if (process.env.BFC_POS_CATALOG_CAPS_DEBUG === "1") {
        if (!allowsSizes && (it.baseType || it.sizeLabel)) {
          app.log.warn(
            {
              event: "catalog_caps_strip_size",
              itemCloudId: it.itemId,
              itemName: dbItem.name,
              localHasSizes: cloudItemRow?.hasSizes,
              sentBaseType: it.baseType,
              sentSizeLabel: it.sizeLabel,
            },
            "[CATALOG_CAPS_DEBUG] Item hasSizes=false but POS sent size fields — normalized server-side"
          );
        }
        if (!allowsShots && (it.shotsQty ?? 0) > 0) {
          app.log.warn(
            {
              event: "catalog_caps_strip_shots",
              itemCloudId: it.itemId,
              itemName: dbItem.name,
              localSupportsShots: cloudItemRow?.supportsShots,
              sentShotsQty: it.shotsQty,
            },
            "[CATALOG_CAPS_DEBUG] Item supportsShots=false but POS sent shots — normalized server-side"
          );
        }
      }

      const qty = Math.max(1, Math.trunc(it.qty || 1));
      const optIds = it.optionIds ?? [];
      const hasSizeSelection = !!(effectiveBaseType && effectiveSizeLabel);
      const sizeish = (s: string) => {
        const n = s.toLowerCase();
        return n.includes("size") || n.includes("temperature") || /\btemp\b/.test(n);
      };
      const deltas = optIds.map((oid) => {
        const o = optionMap.get(oid);
        const co = cloudOptionMap.get(oid);
        const addOn = addOnMap.get(oid);
        if (o) {
          if (!allowsSizes && sizeish(o.group?.name ?? "")) return 0;
          if (hasSizeSelection && (o.group?.name ?? "").toLowerCase().includes("size")) return 0;
          const name = (o.name ?? "").toLowerCase();
          if (!allowsShots && (name.includes("shot") || name.includes("espresso shot"))) return 0;
          if (name.includes("shot") || name.includes("espresso shot")) return 0;
          return o.priceDelta ?? 0;
        }
        if (co) {
          if (!allowsSizes && sizeish(co.groupName)) return 0;
          if (hasSizeSelection && co.groupName.toLowerCase().includes("size")) return 0;
          if (co.groupName.toLowerCase().includes("shot")) return 0;
          const name = (co.name ?? "").toLowerCase();
          if (!allowsShots && (name.includes("shot") || name.includes("espresso shot"))) return 0;
          if (name.includes("shot") || name.includes("espresso shot")) return 0;
          return co.priceDelta ?? 0;
        }
        if (addOn) {
          const name = (addOn.name ?? "").toLowerCase();
          if (!allowsShots && (name.includes("shot") || name.includes("espresso shot"))) return 0;
          if (name.includes("shot") || name.includes("espresso shot")) return 0;
          return addOn.priceDelta ?? 0;
        }
        return 0;
      });
      let modifiersCents = sum(deltas);

      // Add espresso shots upcharge (server-side recalculation for money safety)
      // Resolve included shots: per size+temp from CloudMenuItemSizePrice, else item defaultShots
      const cloudItem = cloudItemMap.get(it.itemId);
      let includedShots: number | null = allowsShots ? (cloudItem?.defaultShots ?? null) : 0;
      if (allowsShots && effectiveBaseType && effectiveSizeLabel) {
        const sizeKey = `${it.itemId}|${effectiveBaseType}|${effectiveSizeLabel}`;
        const fromSizePrice = includedShotsMap.get(sizeKey);
        if (typeof fromSizePrice === "number") {
          includedShots = fromSizePrice;
        }
      }
      const shotsUpchargeCents = calculateShotsUpcharge(
        effectiveShotsQty,
        dbItem.shotsPricingMode,
        includedShots,
        shotRule
      );
      modifiersCents += shotsUpchargeCents;

      // Milk upcharge: per-size/mode when available (e.g. 70 regular, 180 1-liter), else flat substitute price
      const effectiveDefaultMilk = it.defaultMilk ?? dbItem.defaultMilk;
      let milkUpchargeCents = 0;
      if (it.selectedSubstituteCloudId) {
        const cloudItem = cloudItemMap.get(it.itemId);
        const defaultSubId = cloudItem?.defaultSubstituteCloudId ?? null;
        let selectedPrice = 0;
        let defaultPrice = 0;
        let sizeCloudId = optIds.find((id) => sizeCloudIdsSet.has(id)) ?? null;
        const mode = (effectiveBaseType ?? "").toUpperCase();
        if (!sizeCloudId && effectiveSizeLabel && mode) {
          const fromLabel = sizeLabelToCloudId.get(effectiveSizeLabel.trim().toLowerCase());
          if (fromLabel) sizeCloudId = fromLabel;
        }
        if (sizeCloudId && mode) {
          const keySelected = `${it.selectedSubstituteCloudId}|${sizeCloudId}|${mode}`;
          if (substitutePriceBySizeMap.has(keySelected)) selectedPrice = substitutePriceBySizeMap.get(keySelected)!;
          if (!substitutePriceBySizeMap.has(keySelected)) {
            app.log.warn(
              {
                event: "milk_matrix_missing",
                substituteCloudId: it.selectedSubstituteCloudId,
                defaultSubId,
                sizeCloudId,
                sizeLabel: effectiveSizeLabel,
                mode,
              },
              "[Milk] Missing substitute matrix row (selected)"
            );
          }
        }
        // Strict: when size+mode is known but matrix row is missing, treat as 0 (avoid accidental fallback charges).
        if (!sizeCloudId || !mode) {
          selectedPrice = substitutePriceMap.get(it.selectedSubstituteCloudId) ?? 0;
          defaultPrice = defaultSubId != null ? substitutePriceMap.get(defaultSubId) ?? 0 : 0;
        }

        // Hard rule: default milk always adds 0; otherwise use selected tier price (matrix) directly.
        milkUpchargeCents =
          defaultSubId && it.selectedSubstituteCloudId === defaultSubId ? 0 : Math.max(0, selectedPrice);
      } else {
        milkUpchargeCents = calculateMilkUpcharge(it.milkChoice as MilkType | undefined, effectiveDefaultMilk);
      }
      modifiersCents += milkUpchargeCents;

      // Add per-line surcharge (e.g., FOODPANDA)
      const lineSurchargeCents = it.surchargeCents ?? 0;

      // Per-line discount
      const lineDiscountCents = Math.max(0, Math.trunc(Number(it.discountAmount ?? 0)));

      // Base unit price: if line has size selection and per-size price exists, use it; otherwise fall back to item basePrice.
      let unitPrice = dbItem.basePrice;
      if (effectiveBaseType && effectiveSizeLabel) {
        const sizeLabelNorm = effectiveSizeLabel.trim().toLowerCase();
        const sizeCodeResolved = sizeLabelToCloudId.get(sizeLabelNorm) ?? effectiveSizeLabel;
        const key = `${it.itemId}|${effectiveBaseType}|${effectiveSizeLabel}`;
        const keyByCode = `${it.itemId}|${effectiveBaseType}|${sizeCodeResolved}`;
        const sizedPrice = sizePriceMap.get(key) ?? sizePriceMap.get(keyByCode);
        if (typeof sizedPrice === "number" && sizedPrice >= 0) {
          unitPrice = sizedPrice;
        }
      }
      const lineSubtotal = (unitPrice + modifiersCents) * qty + (lineSurchargeCents * qty);
      const lineTotal = Math.max(0, lineSubtotal - lineDiscountCents);

      // Build options JSON including shots, milk, and add-ons for audit trail and sticker
      const optionsData: any[] = optIds.map((oid) => {
        const o = optionMap.get(oid);
        const co = cloudOptionMap.get(oid);
        const addOn = addOnMap.get(oid);
        if (o) return { id: oid, name: o.name, group: o.group?.name, priceDelta: o.priceDelta };
        if (co) return { id: oid, name: co.name, group: co.groupName, priceDelta: co.priceDelta };
        if (addOn) return { id: oid, name: addOn.name, group: "Add-ons", priceDelta: addOn.priceDelta };
        return { id: oid, missing: true };
      });

      if (effectiveShotsQty > 0) {
        optionsData.push({
          type: "shots",
          qty: effectiveShotsQty,
          upchargeCents: shotsUpchargeCents,
        });
      }

      if (effectiveBaseType && effectiveSizeLabel) {
        optionsData.push({ type: "size", baseType: effectiveBaseType, sizeLabel: effectiveSizeLabel });
      }

      if (it.selectedSubstituteCloudId) {
        optionsData.push({
          type: "substitute",
          cloudId: it.selectedSubstituteCloudId,
          name: it.milkChoice ?? undefined,
          upchargeCents: milkUpchargeCents,
        });
      } else if (it.milkChoice && effectiveDefaultMilk != null && it.milkChoice !== effectiveDefaultMilk) {
        optionsData.push({
          type: "milk",
          choice: it.milkChoice,
          upchargeCents: milkUpchargeCents,
        });
      }

      if (lineSurchargeCents > 0) {
        optionsData.push({
          type: "surcharge",
          amountCents: lineSurchargeCents,
          reason: "FOODPANDA"
        });
      }

      if (lineDiscountCents > 0) {
        optionsData.push({
          type: "discount",
          pct: it.discountPct ?? 0,
          amountCents: lineDiscountCents,
          tag: it.discountTag
        });
      }

      const optionsJson = filterOptionsJsonByItemCaps(JSON.stringify(optionsData), {
        allowStructuredSize: allowsSizes,
        allowShots: allowsShots,
      }) as string;

      const categoryName =
        cloudItem?.categoryCloudId != null ? categoryNameByCloudId.get(cloudItem.categoryCloudId) ?? null : null;
      const subCategoryName =
        cloudItem?.subCategoryCloudId != null ? subCategoryNameByCloudId.get(cloudItem.subCategoryCloudId) ?? null : null;

      return {
        itemId: dbItem.id,
        name: dbItem.name,
        qty,
        unitPrice,
        modifiersCents,
        lineTotal,
        note: it.note?.trim() || null,
        specialInstructions: it.specialInstructions?.trim() || null,
        customerName: it.customerName?.trim() || null,
        optionsJson,
        isDrink: cloudItem?.isDrink ?? null,
        serveVessel: cloudItem?.serveVessel ?? null,
        categoryName: categoryName ?? undefined,
        subCategoryName: subCategoryName ?? undefined,
      };
    });

    // SnapResibo QR lines (virtual item; price from settings)
    const snapResiboPriceCents = Math.max(0, storeConfigForCreate?.snapResiboPriceCents ?? 0);
    for (const snap of snapResiboItems) {
      const qty = Math.max(1, Math.trunc(snap.qty || 1));
      const lineTotal = snapResiboPriceCents * qty;
      lineSnapshots.push({
        itemId: null,
        name: "SnapResibo QR",
        qty,
        unitPrice: snapResiboPriceCents,
        modifiersCents: 0,
        lineTotal,
        note: null,
        specialInstructions: null,
        customerName: null,
        optionsJson: "[]",
        isDrink: null,
        serveVessel: null,
        categoryName: "SnapResibo",
        subCategoryName: "Generate QR",
      });
    }

    const subtotalCents = sum(lineSnapshots.map((l) => l.lineTotal));
    // Note: serviceCents is now 0 because surcharges are per-line (already included in lineTotal)
    const totalCents = Math.max(0, subtotalCents - discountCents);

    const isTest = storeConfigForCreate?.devMode ?? false;
    step = CREATE_TX_STEPS.create_transaction;
    const created = await app.prisma.transaction.create({
      data: {
        storeId: STORE_ID,
        transactionNo: nextNo,
        status: "OPEN",
        source,
        serviceType,
        registerSessionId: open?.id || null, // Optional: link to register session if open
        tableId,
        orderId: orderIdForCreate, // Link to QR order if provided (validated above)
        subtotalCents,
        discountCents,
        serviceCents: 0, // Surcharges are per-line, not transaction-level
        totalCents,
        isTest,
        lineItems: { create: lineSnapshots },
      },
      include: { lineItems: true, payments: true },
    });

    step = CREATE_TX_STEPS.create_audit_log;
    try {
      await app.prisma.auditLog.create({
        data: {
          storeId: STORE_ID,
          action: "TRANSACTION_CREATE",
          entity: "Transaction",
          entityId: created.id,
          metaJson: JSON.stringify({ transactionNo: created.transactionNo, totalCents: created.totalCents }),
        },
      });
    } catch (auditErr) {
      app.log.warn(
        { tag: "[createTransaction]", storeId: STORE_ID, transactionId: created.id, transactionNo: created.transactionNo, err: auditErr },
        "Audit log create failed; transaction already created"
      );
    }

    return created;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err ?? "");

      if (
        errMsg.startsWith("DRINK_MODE_NOT_ALLOWED") ||
        errMsg.startsWith("DRINK_SIZE_NOT_ALLOWED")
      ) {
        logCreateTransactionError(app.log, { storeId: STORE_ID, step, deviceId }, err);
        reply.code(400);
        return {
          code: "INVALID_DRINK_SELECTION",
          message:
            "Drink size or temperature does not match the synced menu. Refresh the menu or adjust the line.",
        };
      }

      if (errMsg.startsWith("Invalid itemId:") || errMsg.includes("CloudMenuItem not found:")) {
        logCreateTransactionError(app.log, { storeId: STORE_ID, step, deviceId }, err);
        const fromWrapped = errMsg.match(/^Invalid itemId:\s*(\S+)\s*\(/);
        const fromBare = errMsg.match(/^Invalid itemId:\s*(\S+)\s*$/);
        const fromCloud = errMsg.match(/CloudMenuItem not found:\s*(.+)$/);
        const badItemId =
          (fromWrapped?.[1] ?? fromBare?.[1] ?? fromCloud?.[1]?.trim()) || undefined;
        reply.code(400);
        return {
          code: "INVALID_CART_ITEM",
          message: "A cart item is not on the menu anymore. Remove it or sync catalog and try again.",
          ...(badItemId ? { itemId: badItemId } : {}),
        };
      }

      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        logCreateTransactionError(app.log, { storeId: STORE_ID, step, deviceId }, err, {
          prismaCode: err.code,
        });
        if (err.code === "P2002") {
          reply.code(409);
          return {
            code: "TRANSACTION_CONFLICT",
            message: "Another sale was saved at the same time. Try payment again.",
          };
        }
        if (err.code === "P2003") {
          reply.code(400);
          return {
            code: "INVALID_REFERENCE",
            message: "Linked order or table is invalid. Refresh and try again.",
          };
        }
      }

      logCreateTransactionError(app.log, { storeId: STORE_ID, step, deviceId }, err);
      const safeMessage =
        step === CREATE_TX_STEPS.validate_input
          ? "Invalid request"
          : step === CREATE_TX_STEPS.resolve_items
            ? "Invalid item in cart"
            : step === CREATE_TX_STEPS.build_line_snapshots
              ? "Pricing or line build failed"
              : step === CREATE_TX_STEPS.create_transaction
                ? "Failed to save transaction"
                : step === CREATE_TX_STEPS.create_audit_log
                  ? "Transaction saved but audit log failed"
                  : "Transaction create failed";
      reply.code(500);
      return {
        code: "TRANSACTION_CREATE_FAILED",
        step,
        message: safeMessage,
      };
    }
  });

  // Add payment (supports split tender). Payment method: normalize and validate to avoid Prisma enum errors.
  const VALID_PAYMENT_METHODS = ["CASH", "CARD", "GCASH", "PAYMONGO", "FOODPANDA", "GRABFOOD", "BFCAPP", "TO_BE_DECIDED"] as const;
  function normalizePaymentMethod(raw: unknown): (typeof VALID_PAYMENT_METHODS)[number] | null {
    const s = raw != null ? String(raw).trim().toUpperCase() : "";
    if (s === "GCASH_MANUAL") return "GCASH";
    return VALID_PAYMENT_METHODS.includes(s as any) ? (s as (typeof VALID_PAYMENT_METHODS)[number]) : null;
  }

  app.post("/pos/transactions/:id/payments", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { method?: unknown; amountCents?: number; refNo?: string };

    const amountCents = Math.trunc(Number(body?.amountCents ?? NaN));
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      reply.code(400);
      return { error: "INVALID_AMOUNT" };
    }
    const method = normalizePaymentMethod(body?.method);
    if (!method) {
      reply.code(400);
      return { error: "MISSING_METHOD", message: "Invalid or missing payment method" };
    }

    const transaction = await app.prisma.transaction.findUnique({
      where: { id },
      include: { payments: true, lineItems: true },
    });
    if (!transaction) {
      reply.code(404);
      return { error: "TRANSACTION_NOT_FOUND" };
    }
    if (transaction.status === "VOID") {
      reply.code(409);
      return { error: "TRANSACTION_VOID" };
    }

    const payment = await app.prisma.transactionPayment.create({
      data: {
        transactionId: transaction.id,
        method,
        status: "PAID",
        amountCents,
        refNo: body.refNo?.trim() || null,
      },
    });

    // Recompute total paid and update transaction status if fully paid
    const allPayments = await app.prisma.transactionPayment.findMany({
      where: { transactionId: transaction.id, status: "PAID" },
    });
    const totalPaid = sum(allPayments.map((p) => p.amountCents));

    if (totalPaid >= transaction.totalCents && transaction.status === "OPEN") {
      const staff = (req as { staff?: { id: string; name: string } }).staff;
      await app.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "PAID", createdBy: staff?.name ?? undefined },
      });
      // SnapResibo: allocate at most one voucher once at finalization; print/reprint will reuse it
      const storeConfigSnap = await app.prisma.storeConfig.findUnique({
        where: { storeId: STORE_ID },
        select: {
          snapResiboEnabled: true,
          snapResiboPriceCents: true,
          snapResiboRewardMinimumCents: true,
        },
      });
      if (storeConfigSnap?.snapResiboEnabled) {
        const hasPaidSnapResiboLine = transaction.lineItems.some(
          (li) => li.name.trim().toLowerCase() === "snapresibo qr" && li.lineTotal > 0
        );
        const qualifiesReward =
          (storeConfigSnap.snapResiboRewardMinimumCents ?? 0) > 0 &&
          transaction.totalCents >= (storeConfigSnap.snapResiboRewardMinimumCents ?? 0);
        const pricePhp = Math.floor((storeConfigSnap.snapResiboPriceCents ?? 0) / 100);
        try {
          const { error } = await allocateVouchersForTransaction(app.prisma, {
            storeId: STORE_ID,
            transactionId: transaction.id,
            receiptNo: transaction.transactionNo,
            hasPaidSnapResiboLine,
            qualifiesReward,
            pricePhp,
          });
          if (error) {
            app.log.warn(
              { transactionId: transaction.id, error },
              "SnapResibo voucher allocation at finalization failed"
            );
          }
        } catch (err) {
          app.log.warn({ err, transactionId: transaction.id }, "SnapResibo allocation at finalization threw");
        }
      }
      // Sync to cloud in background — never block payment completion on cloud latency
      void syncTransactionToCloudOrEnqueue(app.prisma, transaction.id, app.log).catch((err) =>
        app.log.warn({ err, transactionId: transaction.id }, "[TransactionSync] background sync failed")
      );
      // Cloud-recipe inventory (offline): persist per-line frozen consumption + local ledger; cloud uses same JSON and skips recompute
      const paidLines = transaction.lineItems.filter((l) => l.itemId);
      if (paidLines.length > 0) {
        try {
          const withItems = await app.prisma.transactionLineItem.findMany({
            where: { transactionId: transaction.id, id: { in: paidLines.map((l) => l.id) } },
            include: { item: { select: { cloudId: true } } },
          });
          await finalizePaidTransactionInventory({
            prisma: app.prisma,
            storeId: transaction.storeId,
            transactionId: transaction.id,
            lineItems: withItems.map((l) => ({
              id: l.id,
              qty: l.qty,
              optionsJson: l.optionsJson,
              item: l.item,
            })),
            createdByStaffId: staff?.id,
            inventoryWarn: (meta, msg) => app.log.warn(meta, msg),
            inventory: app.inventoryService,
          });
        } catch (err) {
          app.log.error(
            { err, transactionId: transaction.id, storeId: transaction.storeId },
            "[INVENTORY] Sale consumption failed, enqueueing for retry"
          );
          await enqueueOutbox(app.prisma, {
            storeId: transaction.storeId,
            topic: "inventory.consume.sale",
            payload: {
              transactionId: transaction.id,
              createdByStaffId: staff?.id ?? null,
            },
          });
        }
      }
    }

    return { ok: true, payment };
  });

  // Void transaction (entire transaction)
  app.post("/pos/transactions/:id/void", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { reason?: string };

    const reason = body?.reason?.trim();
    if (!reason) {
      reply.code(400);
      return { error: "MISSING_REASON" };
    }

    const transaction = await app.prisma.transaction.findUnique({
      where: { id },
      include: { payments: true },
    });
    if (!transaction) {
      reply.code(404);
      return { error: "TRANSACTION_NOT_FOUND" };
    }
    if (transaction.status === "VOID") return transaction;

    const voided = await app.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: "VOID",
        voidedAt: new Date(),
        voidReason: reason,
        payments: { updateMany: { where: { status: "PAID" }, data: { status: "VOID" } } },
      },
      include: { payments: true, lineItems: true },
    });

    void syncTransactionToCloudOrEnqueue(app.prisma, voided.id, app.log).catch((err) =>
      app.log.warn({ err, transactionId: voided.id }, "[TransactionSync] void sync failed")
    );

    try {
      const full = await app.prisma.transaction.findUnique({
        where: { id: voided.id },
        include: {
          lineItems: { include: { item: { select: { cloudId: true } } } },
          refunds: { include: { refundItems: true } },
        },
      });
      if (full) {
        await restoreInventoryForVoid({
          prisma: app.prisma,
          storeId: full.storeId,
          transactionId: full.id,
          lineItems: full.lineItems.map((l) => ({
            id: l.id,
            qty: l.qty,
            optionsJson: l.optionsJson,
            consumptionPerUnitByIngredientJson: l.consumptionPerUnitByIngredientJson,
            item: l.item,
          })),
          refunds: full.refunds.map((r) => ({
            refundItems: r.refundItems.map((ri) => ({
              transactionLineItemId: ri.transactionLineItemId,
              qtyRefunded: ri.qtyRefunded,
            })),
          })),
          inventoryWarn: (meta, msg) => app.log.warn(meta, msg),
          inventory: app.inventoryService,
        });
      }
    } catch (err) {
      app.log.error({ err, transactionId: voided.id }, "[INVENTORY] Void restore failed");
    }

    await app.prisma.auditLog.create({
      data: {
        storeId: STORE_ID,
        action: "TRANSACTION_VOID",
        entity: "Transaction",
        entityId: voided.id,
        note: reason,
      },
    });

    return voided;
  });

  // Refund specific line items
  app.post("/pos/transactions/:id/refund", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { 
      adminPin: string;
      reason: string;
      lineIds: string[];
    };

    const adminPin = body?.adminPin?.trim();
    if (!adminPin) {
      reply.code(400);
      return { error: "MISSING_ADMIN_PIN" };
    }

    const pinResult = await verifyAdminPin(adminPin, app.prisma);
    if (!pinResult.valid) {
      reply.code(403);
      return { error: "INVALID_ADMIN_PIN" };
    }

    const reason = body?.reason?.trim();
    if (!reason) {
      reply.code(400);
      return { error: "MISSING_REASON" };
    }

    const lineIds = body?.lineIds;
    if (!Array.isArray(lineIds) || lineIds.length === 0) {
      reply.code(400);
      return { error: "MISSING_LINE_IDS" };
    }

    // Load transaction with line items and existing refunds
    const transaction = await app.prisma.transaction.findUnique({
      where: { id },
      include: { 
        lineItems: {
          include: {
            refundItems: true,
          },
        },
        payments: true,
        refunds: {
          include: {
            refundItems: true,
          },
        },
      },
    });

    if (!transaction) {
      reply.code(404);
      return { error: "TRANSACTION_NOT_FOUND" };
    }

    if (transaction.status === "VOID") {
      reply.code(409);
      return { error: "TRANSACTION_VOIDED" };
    }

    // Validate line IDs exist
    const validLineIds = new Set(transaction.lineItems.map(l => l.id));
    const invalidIds = lineIds.filter(id => !validLineIds.has(id));
    if (invalidIds.length > 0) {
      reply.code(400);
      return { error: "INVALID_LINE_IDS", invalidIds };
    }

    // Check if any lines are already fully refunded
    const alreadyRefunded = lineIds.filter(lineId => {
      const line = transaction.lineItems.find(l => l.id === lineId);
      if (!line) return false;
      const totalRefunded = line.refundItems.reduce((sum, ri) => sum + ri.qtyRefunded, 0);
      return totalRefunded >= line.qty;
    });

    if (alreadyRefunded.length > 0) {
      reply.code(409);
      return { error: "LINES_ALREADY_REFUNDED", lineIds: alreadyRefunded };
    }

    // Create refund record
    const refundItems = lineIds.map(lineId => {
      const line = transaction.lineItems.find(l => l.id === lineId);
      if (!line) throw new Error("Line not found");
      
      return {
        transactionLineItemId: lineId,
        qtyRefunded: line.qty,
        amountRefundedCents: line.lineTotal,
      };
    });

    const refund = await app.prisma.transactionRefund.create({
      data: {
        transactionId: transaction.id,
        reason,
        refundedByStaffId: null, // TODO: Link to actual staff when available
        refundItems: {
          create: refundItems,
        },
      },
      include: {
        refundItems: {
          include: {
            transactionLineItem: true,
          },
        },
      },
    });

    // Reload transaction with all refunds
    const updatedTransaction = await app.prisma.transaction.findUnique({
      where: { id },
      include: {
        lineItems: {
          include: {
            refundItems: true,
          },
        },
        payments: true,
        refunds: {
          include: {
            refundItems: {
              include: {
                transactionLineItem: true,
              },
            },
          },
        },
      },
    });

    void syncTransactionToCloudOrEnqueue(app.prisma, id, app.log).catch((err) =>
      app.log.warn({ err, transactionId: id }, "[TransactionSync] refund sync failed")
    );

    try {
      const lineRows = await app.prisma.transactionLineItem.findMany({
        where: { transactionId: id },
        select: {
          id: true,
          consumptionPerUnitByIngredientJson: true,
          optionsJson: true,
          item: { select: { cloudId: true } },
        },
      });
      const lineById = new Map(
        lineRows.map((l) => [
          l.id,
          {
            consumptionPerUnitByIngredientJson: l.consumptionPerUnitByIngredientJson,
            menuItemCloudId: l.item?.cloudId ?? null,
            optionsJson: l.optionsJson,
          },
        ])
      );
      await restoreInventoryForRefund({
        prisma: app.prisma,
        storeId: transaction.storeId,
        refundId: refund.id,
        refundItems: refund.refundItems.map((ri) => ({
          transactionLineItemId: ri.transactionLineItemId,
          qtyRefunded: ri.qtyRefunded,
        })),
        lineById,
        inventoryWarn: (meta, msg) => app.log.warn(meta, msg),
        inventory: app.inventoryService,
      });
    } catch (err) {
      app.log.error({ err, transactionId: id, refundId: refund.id }, "[INVENTORY] Refund restore failed");
    }

    return updatedTransaction;
  });

  // Receipt view (enrich lineItems with categoryCloudId for sticker decision on client; include business name/address for receipt header; include linked SnapResibo voucher when enabled so UI can display same voucher without allocating)
  app.get("/pos/transactions/:id/receipt", async (req, reply) => {
    const { id } = req.params as { id: string };

    const [transaction, storeConfig] = await Promise.all([
      app.prisma.transaction.findUnique({
      where: { id },
      include: {
        lineItems: {
          include: {
            refundItems: true,
            item: { select: { cloudId: true, supportsShots: true } },
          },
        },
        payments: true,
        table: { include: { zone: true } },
        refunds: {
          include: {
            refundItems: true,
          },
        },
      },
    }),
      app.prisma.storeConfig.findUnique({
        where: { storeId: STORE_ID },
        select: storeConfigReceiptSelect,
      }),
    ]);
    if (!transaction) {
      reply.code(404);
      return { error: "TRANSACTION_NOT_FOUND" };
    }

    const cloudIds = [
      ...new Set(
        transaction.lineItems.map((li) => li.item?.cloudId).filter((c): c is string => !!c)
      ),
    ];
    const categoryByCloudId = new Map<string, string | null>();
    const categoryNameByCloudId = new Map<string, string>();
    const subCategoryNameByCloudId = new Map<string, string>();
    const categoryNameByMenuItemCloudId = new Map<string, string>();
    const subCategoryNameByMenuItemCloudId = new Map<string, string>();
    let cloudCapsByCloudId = new Map<
      string,
      { cloudId: string; name: string; hasSizes: boolean; supportsShots: boolean }
    >();
    if (cloudIds.length > 0) {
      const cloudItems = await app.prisma.cloudMenuItem.findMany({
        where: { cloudId: { in: cloudIds }, storeId: STORE_ID },
        select: {
          cloudId: true,
          name: true,
          categoryCloudId: true,
          subCategoryCloudId: true,
          hasSizes: true,
          supportsShots: true,
        },
      });
      for (const row of cloudItems) {
        categoryByCloudId.set(row.cloudId, row.categoryCloudId);
        cloudCapsByCloudId.set(row.cloudId, {
          cloudId: row.cloudId,
          name: row.name,
          hasSizes: row.hasSizes,
          supportsShots: row.supportsShots,
        });
      }
      const catIds = [...new Set(cloudItems.map((r) => r.categoryCloudId).filter((c): c is string => !!c))];
      const subIds = [...new Set(cloudItems.map((r) => r.subCategoryCloudId).filter((c): c is string => !!c))];
      if (catIds.length > 0) {
        const cats = await app.prisma.cloudCategory.findMany({
          where: { cloudId: { in: catIds }, storeId: STORE_ID },
          select: { cloudId: true, name: true },
        });
        for (const c of cats) categoryNameByCloudId.set(c.cloudId, c.name);
      }
      if (subIds.length > 0) {
        const subs = await app.prisma.cloudSubCategory.findMany({
          where: { cloudId: { in: subIds }, storeId: STORE_ID },
          select: { cloudId: true, name: true },
        });
        for (const s of subs) subCategoryNameByCloudId.set(s.cloudId, s.name);
      }
      for (const mi of cloudItems) {
        if (mi.categoryCloudId) categoryNameByMenuItemCloudId.set(mi.cloudId, categoryNameByCloudId.get(mi.categoryCloudId) ?? "");
        if (mi.subCategoryCloudId) subCategoryNameByMenuItemCloudId.set(mi.cloudId, subCategoryNameByCloudId.get(mi.subCategoryCloudId) ?? "");
      }
    }

    const lineItemsWithCategory = transaction.lineItems.map((li) => {
      const cloudId = li.item?.cloudId ?? null;
      const categoryCloudId = cloudId ? categoryByCloudId.get(cloudId) ?? null : null;
      const categoryName = li.categoryName ?? (cloudId ? categoryNameByMenuItemCloudId.get(cloudId) ?? null : null);
      const subCategoryName = li.subCategoryName ?? (cloudId ? subCategoryNameByMenuItemCloudId.get(cloudId) ?? null : null);
      const capRow = cloudId ? cloudCapsByCloudId.get(cloudId) : undefined;
      const allowStructuredSize = cloudId ? capRow?.hasSizes === true : true;
      const allowShots = cloudId ? capRow?.supportsShots === true : (li.item as { supportsShots?: boolean } | null)?.supportsShots !== false;
      const optionsJsonForDisplay = filterOptionsJsonByItemCaps(li.optionsJson, {
        allowStructuredSize,
        allowShots,
      });
      if (process.env.BFC_POS_CATALOG_CAPS_DEBUG === "1" && cloudId && capRow) {
        app.log.info(
          {
            event: "receipt_view_caps",
            lineItemId: li.id,
            itemCloudId: cloudId,
            cloudName: capRow.name,
            localHasSizes: capRow.hasSizes,
            localSupportsShots: capRow.supportsShots,
            allowStructuredSize,
            allowShots,
          },
          "[CATALOG_CAPS_DEBUG] receipt line caps"
        );
      }
      const displayLabel = formatTransactionLineLabel({
        name: li.name,
        optionsJson: optionsJsonForDisplay,
        categoryName: categoryName ?? undefined,
        subCategoryName: subCategoryName ?? undefined,
        qty: li.qty,
        includeQuantity: true,
      });
      return {
        ...li,
        optionsJson: optionsJsonForDisplay ?? li.optionsJson,
        categoryCloudId,
        categoryName: categoryName ?? undefined,
        subCategoryName: subCategoryName ?? undefined,
        displayLabel,
      };
    });
    const receiptHeader = receiptHeaderFromStoreConfig(storeConfig ?? null);

    let snapResiboVouchers: Array<{ voucherId: string; pricePhp: number }> = [];
    if (storeConfig?.snapResiboEnabled) {
      const one = await getSnapResiboVoucherForTransaction(app.prisma, id);
      if (one) {
        const pricePhp = Math.floor((storeConfig.snapResiboPriceCents ?? 0) / 100);
        snapResiboVouchers = [
          { voucherId: one.voucherId, pricePhp: one.source === "PAID_ITEM" ? pricePhp : 0 },
        ];
      }
    }

    return {
      ...transaction,
      lineItems: lineItemsWithCategory,
      ...(receiptHeader && {
        businessName: receiptHeader.businessName,
        address: receiptHeader.address,
        receiptTaxType: receiptHeader.receiptTaxType,
        receiptNonVatTin: receiptHeader.receiptNonVatTin,
        receiptVatTin: receiptHeader.receiptVatTin,
        receiptBirMin: receiptHeader.receiptBirMin,
        receiptBirSerialNo: receiptHeader.receiptBirSerialNo,
      }),
      ...(snapResiboVouchers.length > 0 && { snapResiboVouchers }),
    };
  });

  // Direct print receipt (local printer, no browser). SnapResibo: uses voucher already linked at finalization; never allocates here.
  app.post("/pos/transactions/:id/print-receipt", async (req, reply) => {
    const { id } = req.params as { id: string };
    const transaction = await app.prisma.transaction.findUnique({
      where: { id },
      include: { lineItems: true, payments: true },
    });
    if (!transaction) {
      reply.code(404);
      return { error: "TRANSACTION_NOT_FOUND" };
    }
    // Full row read (all scalars) so receipt header fields always match DB columns — avoids any select-shape gaps.
    const storeConfigRow = await app.prisma.storeConfig.findUnique({
      where: { storeId: STORE_ID },
    });
    const receiptHeader = receiptHeaderFromStoreConfig(storeConfigRow);

    const txForPrint = {
      ...transaction,
      createdAt:
        transaction.createdAt instanceof Date
          ? transaction.createdAt.toISOString()
          : String(transaction.createdAt),
    };

    let vouchersForPrint: Array<{ voucherId: string; pricePhp: number }> = [];
    let snapResiboError: string | null = null;

    if (storeConfigRow?.snapResiboEnabled) {
      const pricePhp = Math.floor((storeConfigRow.snapResiboPriceCents ?? 0) / 100);
      const hasPaidSnapResiboLine = transaction.lineItems.some(
        (li) => li.name.trim().toLowerCase() === "snapresibo qr" && li.lineTotal > 0
      );
      const qualifiesReward =
        (storeConfigRow.snapResiboRewardMinimumCents ?? 0) > 0 &&
        transaction.totalCents >= (storeConfigRow.snapResiboRewardMinimumCents ?? 0);
      const expectsVoucher = hasPaidSnapResiboLine || qualifiesReward;

      const one = await getSnapResiboVoucherForTransaction(app.prisma, transaction.id);
      if (one) {
        vouchersForPrint = [
          { voucherId: one.voucherId, pricePhp: one.source === "PAID_ITEM" ? pricePhp : 0 },
        ];
      } else if (expectsVoucher) {
        snapResiboError = "NO_VOUCHER_LINKED";
      }
    }

    try {
      await printReceiptToDevice(
        txForPrint,
        receiptHeader,
        vouchersForPrint.length > 0 ? vouchersForPrint : undefined,
        app.prisma,
        STORE_ID
      );
      return snapResiboError ? { ok: true, snapResiboError } : { ok: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err ?? "Receipt print failed");
      app.log.error({ err, transactionId: id }, "Print receipt failed");
      reply.code(500);
      return { error: "PRINT_FAILED", message };
    }
  });

  // Order slip (receipt printer, ESC/POS); kitchen copy — no prices, no SnapResibo, no drawer.
  async function runPrintOrderSlip(
    transactionId: string,
    reply: FastifyReply,
    lineItemIds?: string[] | null
  ) {
    const transaction = await app.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { lineItems: true, payments: true },
    });
    if (!transaction) {
      reply.code(404);
      return { error: "TRANSACTION_NOT_FOUND" };
    }
    let lineRows = transaction.lineItems;
    if (lineItemIds && lineItemIds.length > 0) {
      const allowed = new Set(lineItemIds);
      lineRows = lineRows.filter((li) => allowed.has(li.id));
      if (lineRows.length === 0) {
        reply.code(400);
        return { error: "NO_LINE_ITEMS", message: "No matching line items for print" };
      }
    }
    const txForPrint: TransactionForPrint = {
      transactionNo: transaction.transactionNo,
      totalCents: transaction.totalCents,
      createdAt:
        transaction.createdAt instanceof Date
          ? transaction.createdAt.toISOString()
          : String(transaction.createdAt),
      createdBy: transaction.createdBy,
      serviceType: transaction.serviceType,
      lineItems: lineRows.map((li) => ({
        itemId: li.itemId,
        name: li.name,
        qty: li.qty,
        unitPrice: li.unitPrice,
        lineTotal: li.lineTotal,
        note: li.note,
        optionsJson: li.optionsJson,
        categoryName: li.categoryName,
        subCategoryName: li.subCategoryName,
        specialInstructions: li.specialInstructions,
        customerName: li.customerName,
      })),
      payments: transaction.payments.map((p) => ({
        method: p.method,
        amountCents: p.amountCents,
      })),
    };
    try {
      await printOrderSlip(txForPrint, app.prisma, STORE_ID);
      return { ok: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err ?? "Order slip print failed");
      app.log.error({ err, transactionId }, "Print order slip failed");
      reply.code(500);
      return { error: "PRINT_FAILED", message };
    }
  }

  app.post("/pos/transactions/:id/print-order-slip", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { lineItemIds?: string[] };
    const lineItemIds = Array.isArray(body.lineItemIds) ? body.lineItemIds : undefined;
    return runPrintOrderSlip(id, reply, lineItemIds);
  });

  app.post("/print/order-slip/:transactionId", async (req, reply) => {
    const { transactionId } = req.params as { transactionId: string };
    const body = (req.body ?? {}) as { lineItemIds?: string[] };
    const lineItemIds = Array.isArray(body.lineItemIds) ? body.lineItemIds : undefined;
    return runPrintOrderSlip(transactionId, reply, lineItemIds);
  });

  // Direct print stickers (local printer, no browser); uses store stickerPrintCategoryIds and line categoryCloudId
  app.post("/pos/transactions/:id/print-stickers", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { lineItemIds?: string[] };
    const lineItemIds = Array.isArray(body.lineItemIds) ? body.lineItemIds : undefined;
    const transaction = await app.prisma.transaction.findUnique({
      where: { id },
      include: {
        lineItems: { include: { item: { select: { cloudId: true } } } },
        payments: true,
      },
    });
    if (!transaction) {
      reply.code(404);
      return { error: "TRANSACTION_NOT_FOUND" };
    }
    let stickerLines = transaction.lineItems;
    if (lineItemIds && lineItemIds.length > 0) {
      const allowed = new Set(lineItemIds);
      stickerLines = stickerLines.filter((li) => allowed.has(li.id));
      if (stickerLines.length === 0) {
        reply.code(400);
        return { error: "NO_LINE_ITEMS", message: "No matching line items for sticker print" };
      }
    }
    const storeConfig = await app.prisma.storeConfig.findUnique({
      where: { storeId: STORE_ID },
    });
    const stickerPrintCategoryIds = storeConfig?.stickerPrintCategoryIds
      ? (JSON.parse(storeConfig.stickerPrintCategoryIds) as string[])
      : [];
    const cloudIds = [
      ...new Set(
        stickerLines.map((li) => li.item?.cloudId).filter((c): c is string => !!c)
      ),
    ];
    const categoryByCloudId = new Map<string, string | null>();
    const subCategoryNameByMenuItemCloudId = new Map<string, string | null>();
    if (cloudIds.length > 0) {
      const cloudItems = await app.prisma.cloudMenuItem.findMany({
        where: { cloudId: { in: cloudIds } },
        select: { cloudId: true, categoryCloudId: true, subCategoryCloudId: true },
      });
      for (const row of cloudItems) {
        categoryByCloudId.set(row.cloudId, row.categoryCloudId);
      }
      const subCategoryCloudIds = [...new Set(cloudItems.map((r) => r.subCategoryCloudId).filter((c): c is string => !!c))];
      const subCategoryNameBySubCloudId = new Map<string, string>();
      if (subCategoryCloudIds.length > 0) {
        const subCats = await app.prisma.cloudSubCategory.findMany({
          where: { cloudId: { in: subCategoryCloudIds } },
          select: { cloudId: true, name: true },
        });
        for (const s of subCats) subCategoryNameBySubCloudId.set(s.cloudId, s.name);
      }
      for (const row of cloudItems) {
        const name = row.subCategoryCloudId ? (subCategoryNameBySubCloudId.get(row.subCategoryCloudId) ?? null) : null;
        subCategoryNameByMenuItemCloudId.set(row.cloudId, name);
      }
    }
    const enrichedLineItems = stickerLines.map((li) => ({
      itemId: li.itemId,
      name: li.name,
      qty: li.qty,
      unitPrice: li.unitPrice,
      lineTotal: li.lineTotal,
      note: li.note,
      specialInstructions: li.specialInstructions ?? null,
      customerName: li.customerName ?? null,
      optionsJson: li.optionsJson,
      categoryCloudId: li.item?.cloudId ? categoryByCloudId.get(li.item.cloudId) ?? null : null,
      subCategoryName: li.item?.cloudId ? subCategoryNameByMenuItemCloudId.get(li.item.cloudId) ?? null : null,
      stickerName: undefined as string | null | undefined,
    }));
    const txForPrint = {
      ...transaction,
      createdAt:
        transaction.createdAt instanceof Date
          ? transaction.createdAt.toISOString()
          : String(transaction.createdAt),
      lineItems: enrichedLineItems,
    };
    try {
      const result = await printStickersToDevice(txForPrint, { stickerPrintCategoryIds }, app.prisma, STORE_ID);
      if (result.printed === 0) {
        reply.code(400);
        return { error: "NO_STICKER_ITEMS", message: "No sticker items in this transaction" };
      }
      return { ok: true, printed: result.printed };
    } catch (err: any) {
      app.log.error({ err, transactionId: id }, "Print stickers failed");
      reply.code(500);
      return { error: "PRINT_FAILED", message: err?.message ?? "Sticker print failed" };
    }
  });

  app.post("/pos/transactions/z-reading/print", async (req, reply) => {
    const body = (req.body ?? {}) as { selectedDate?: string };
    const selectedDate = String(body.selectedDate ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      reply.code(400);
      return { error: "INVALID_DATE", message: "selectedDate must be YYYY-MM-DD" };
    }

    const printerConfig = await app.prisma.storeConfig.findUnique({
      where: { storeId: STORE_ID },
      select: { enabledPaymentMethods: true },
    });

    const range = getCalendarDayRange(selectedDate);
    app.log.info(
      {
        event: "z_reading_print_request",
        selectedDate,
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        enabledPaymentMethods: printerConfig?.enabledPaymentMethods ?? null,
      },
      "[Z_READING] print request"
    );

    try {
      const report = await printZReading(app.prisma, selectedDate);
      app.log.info(
        {
          event: "z_reading_print_success",
          selectedDate,
          printerName: report.printerName,
          from: report.from.toISOString(),
          to: report.to.toISOString(),
          transactionCount: report.totals.transactionCount,
          totals: report.totals,
        },
        "[Z_READING] printed"
      );
      return {
        ok: true,
        selectedDate,
        from: report.from.toISOString(),
        to: report.to.toISOString(),
        transactionCount: report.totals.transactionCount,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err ?? "Z-reading print failed");
      app.log.error(
        { err, selectedDate, event: "z_reading_print_failure" },
        "[Z_READING] print failed — check [BFC_PRINTER] logs for printer name loaded from settings and print result"
      );
      reply.code(500);
      return { error: "PRINT_FAILED", message };
    }
  });
}
