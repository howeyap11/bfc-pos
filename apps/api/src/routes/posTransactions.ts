// apps/api/src/routes/posTransactions.ts
//
// RegisterSession Enforcement: DISABLED
// ========================================
// TODO: RegisterSession enforcement disabled until cash reconciliation module is implemented.
// Staff login (cashier PIN) is sufficient for auditing.
// When cash reconciliation is ready, re-enable the NO_OPEN_REGISTER check in POST /pos/transactions.
//
import type { FastifyInstance } from "fastify";
import type { MilkType, ServiceType, ShotsPricingMode } from "@prisma/client";
import { requireStaffHook } from "../plugins/staffGuard";
import { verifyAdminPin } from "../services/adminPin.service";
import { enqueueOutbox } from "../services/outbox.service";
import { ensureItemForCloudId } from "../services/catalogCache.service";
import { uploadTransactionToCloud } from "../services/transactionSync.service";
import { printReceiptToDevice, printStickersToDevice, formatTransactionLineLabel } from "../services/print.service";
import {
  allocateVouchersForTransaction,
  getVouchersForTransaction,
} from "../services/snapResiboVoucher.service";

const STORE_ID = "store_1";
const SNAPRESIBO_QR_ITEM_ID = "SNAPRESIBO_QR";

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
    const bundles = Math.ceil(extraShots / shotRule.shotsPerBundle);
    return bundles * shotRule.priceCentsPerBundle;
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

  // List recent transactions with pagination
  const listTransactions = async (req: any) => {
    const query = req.query as { limit?: string; cursor?: string };
    const limit = Math.min(parseInt(query.limit || "30") || 30, 100);
    const cursor = query.cursor ? parseInt(query.cursor) : null;
    
    const transactions = await app.prisma.transaction.findMany({
      where: { 
        storeId: STORE_ID,
        ...(cursor ? { transactionNo: { lt: cursor } } : {}),
      },
      orderBy: { transactionNo: "desc" },
      take: limit + 1, // Fetch one extra to determine if there's a next page
      include: {
        lineItems: {
          include: {
            refundItems: true,
            item: {
              select: {
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

    const items = rawItems.map((tx) => ({
      ...tx,
      lineItems: tx.lineItems.map((li) => ({
        ...li,
        displayLabel: formatTransactionLineLabel({
          name: li.name,
          optionsJson: li.optionsJson,
          categoryName: li.categoryName ?? li.item?.category?.name ?? undefined,
          subCategoryName: li.subCategoryName ?? undefined,
          qty: li.qty,
          includeQuantity: true,
        }),
      })),
    }));

    return {
      items,
      nextCursor,
      hasMore,
    };
  };

  app.get("/pos/transactions", listTransactions);
  app.get("/pos/transactions/list", listTransactions);

  // Create transaction + line items (no payment yet)
  app.post("/pos/transactions", async (req, reply) => {
    const body = req.body as {
      tablePublicKey?: string;
      items: Array<{
        itemId: string;
        qty: number;
        optionIds: string[];
        note?: string;
        specialInstructions?: string; // Prep only, for sticker (quoted below ice); note remains for audit/discount
        customerName?: string; // Per-item name for sticker (left of temp/size)
        baseType?: "HOT" | "ICED" | "CONCENTRATED";
        sizeLabel?: string;
        shotsQty?: number;
        milkChoice?: string; // Substitute name for display or legacy MilkType
        selectedSubstituteCloudId?: string; // For milk upcharge from cloud substitute price
        defaultMilk?: MilkType;
        surchargeCents?: number; // Per-line surcharge (e.g., FOODPANDA)
        discountPct?: number; // Per-line discount percentage
        discountAmount?: number; // Per-line discount amount in cents
        discountTag?: "SNR" | "PWD" | null; // Discount type for audit
      }>;
      discountCents?: number;
      serviceType?: "DINE_IN" | "TO_GO" | "FOODPANDA" | "DELIVERY" | "FOR_HERE" | "TAKE_OUT";
      orderId?: string; // Optional link to QR order
    };

    if (!Array.isArray(body?.items) || body.items.length === 0) {
      reply.code(400);
      return { error: "EMPTY_ITEMS" };
    }

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
      select: { snapResiboEnabled: true, snapResiboPriceCents: true, snapResiboRewardMinimumCents: true },
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

    // itemId from POS is cloudId (from CloudMenuItem); resolve to Item.id for storage + inventory (exclude SnapResibo virtual item)
    const cloudIds = [...new Set(regularItems.map((i) => i.itemId))];
    const optionIds = [...new Set(regularItems.flatMap((i) => i.optionIds ?? []))];

    const resolvedIds: string[] = [];
    for (const cid of cloudIds) {
      try {
        const itemId = await ensureItemForCloudId(app.prisma, cid);
        resolvedIds.push(itemId);
      } catch {
        throw new Error(`Invalid itemId: ${cid}`);
      }
    }

    const dbItems = await app.prisma.item.findMany({
      where: { id: { in: resolvedIds } },
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

      const qty = Math.max(1, Math.trunc(it.qty || 1));
      const optIds = it.optionIds ?? [];
      const shotsQty = it.shotsQty ?? 0;
      const hasSizeSelection = !!(it.baseType && it.sizeLabel);
      const deltas = optIds.map((oid) => {
        const o = optionMap.get(oid);
        const co = cloudOptionMap.get(oid);
        const addOn = addOnMap.get(oid);
        if (o) {
          if (hasSizeSelection && (o.group?.name ?? "").toLowerCase().includes("size")) return 0;
          const name = (o.name ?? "").toLowerCase();
          if (name.includes("shot") || name.includes("espresso shot")) return 0;
          return o.priceDelta ?? 0;
        }
        if (co) {
          if (hasSizeSelection && co.groupName.toLowerCase().includes("size")) return 0;
          if (co.groupName.toLowerCase().includes("shot")) return 0;
          const name = (co.name ?? "").toLowerCase();
          if (name.includes("shot") || name.includes("espresso shot")) return 0;
          return co.priceDelta ?? 0;
        }
        if (addOn) {
          const name = (addOn.name ?? "").toLowerCase();
          if (name.includes("shot") || name.includes("espresso shot")) return 0;
          return addOn.priceDelta ?? 0;
        }
        return 0;
      });
      let modifiersCents = sum(deltas);

      // Add espresso shots upcharge (server-side recalculation for money safety)
      // Resolve included shots: per size+temp from CloudMenuItemSizePrice, else item defaultShots
      const cloudItem = cloudItemMap.get(it.itemId);
      let includedShots: number | null = cloudItem?.defaultShots ?? null;
      if (it.baseType && it.sizeLabel) {
        const sizeKey = `${it.itemId}|${it.baseType}|${it.sizeLabel}`;
        const fromSizePrice = includedShotsMap.get(sizeKey);
        if (typeof fromSizePrice === "number") {
          includedShots = fromSizePrice;
        }
      }
      const shotsUpchargeCents = calculateShotsUpcharge(
        shotsQty,
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
        let selectedPrice = substitutePriceMap.get(it.selectedSubstituteCloudId) ?? 0;
        let defaultPrice = defaultSubId != null ? substitutePriceMap.get(defaultSubId) ?? 0 : 0;
        let sizeCloudId = optIds.find((id) => sizeCloudIdsSet.has(id)) ?? null;
        const mode = (it.baseType ?? "").toUpperCase();
        if (!sizeCloudId && it.sizeLabel && mode) {
          const fromLabel = sizeLabelToCloudId.get(it.sizeLabel.trim().toLowerCase());
          if (fromLabel) sizeCloudId = fromLabel;
        }
        if (sizeCloudId && mode) {
          const keySelected = `${it.selectedSubstituteCloudId}|${sizeCloudId}|${mode}`;
          const keyDefault = defaultSubId != null ? `${defaultSubId}|${sizeCloudId}|${mode}` : null;
          if (substitutePriceBySizeMap.has(keySelected)) selectedPrice = substitutePriceBySizeMap.get(keySelected)!;
          if (keyDefault != null && substitutePriceBySizeMap.has(keyDefault)) defaultPrice = substitutePriceBySizeMap.get(keyDefault)!;
        }
        // Default milk is included in base price; only charge the increment for a non-default milk
        const defaultPriceForDelta = it.selectedSubstituteCloudId === defaultSubId ? selectedPrice : 0;
        milkUpchargeCents = Math.max(0, selectedPrice - defaultPriceForDelta);
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
      if (it.baseType && it.sizeLabel) {
        const sizeLabelNorm = it.sizeLabel.trim().toLowerCase();
        const sizeCodeResolved = sizeLabelToCloudId.get(sizeLabelNorm) ?? it.sizeLabel;
        const key = `${it.itemId}|${it.baseType}|${it.sizeLabel}`;
        const keyByCode = `${it.itemId}|${it.baseType}|${sizeCodeResolved}`;
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

      if (shotsQty > 0) {
        optionsData.push({ 
          type: "shots", 
          qty: shotsQty, 
          upchargeCents: shotsUpchargeCents 
        });
      }

      if (it.baseType && it.sizeLabel) {
        optionsData.push({ type: "size", baseType: it.baseType, sizeLabel: it.sizeLabel });
      }
      
      if (it.milkChoice && (it.selectedSubstituteCloudId != null || (effectiveDefaultMilk != null && it.milkChoice !== effectiveDefaultMilk))) {
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

      const optionsJson = JSON.stringify(optionsData);

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

    // Debug logging for money accuracy
    console.log("[TX CREATE] Pricing breakdown:", {
      lineCount: lineSnapshots.length,
      lines: lineSnapshots.map(l => ({
        name: l.name,
        qty: l.qty,
        unitPrice: l.unitPrice,
        modifiersCents: l.modifiersCents,
        lineTotal: l.lineTotal,
      })),
      subtotalCents,
      discountCents,
      totalCents,
    });

    const created = await app.prisma.transaction.create({
      data: {
        storeId: STORE_ID,
        transactionNo: nextNo,
        status: "OPEN",
        source,
        serviceType,
        registerSessionId: open?.id || null, // Optional: link to register session if open
        tableId,
        orderId: body.orderId || null, // Link to QR order if provided
        subtotalCents,
        discountCents,
        serviceCents: 0, // Surcharges are per-line, not transaction-level
        totalCents,
        lineItems: { create: lineSnapshots },
      },
      include: { lineItems: true, payments: true },
    });

    await app.prisma.auditLog.create({
      data: {
        storeId: STORE_ID,
        action: "TRANSACTION_CREATE",
        entity: "Transaction",
        entityId: created.id,
        metaJson: JSON.stringify({ transactionNo: created.transactionNo, totalCents: created.totalCents }),
      },
    });

    return created;
  });

  // Add payment (supports split tender)
  app.post("/pos/transactions/:id/payments", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { method: any; amountCents?: number; refNo?: string };

    const amountCents = Math.trunc(Number(body?.amountCents ?? NaN));
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      reply.code(400);
      return { error: "INVALID_AMOUNT" };
    }
    if (!body?.method) {
      reply.code(400);
      return { error: "MISSING_METHOD" };
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
        method: body.method,
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
      // Sync to cloud (best effort, non-blocking)
      const paymentsList = allPayments.map((p) => ({ method: p.method, amountCents: p.amountCents }));
      const lineItemsList = transaction.lineItems.map((l) => ({ name: l.name, qty: l.qty, lineTotal: l.lineTotal }));
      const uploadResult = await uploadTransactionToCloud(
        app.prisma,
        { ...transaction, status: "PAID", createdBy: staff?.name ?? transaction.createdBy ?? null },
        paymentsList,
        lineItemsList
      );
      if (!uploadResult.ok) {
        console.log("[TransactionSync] Transaction queued for cloud sync (retry)", { transactionId: transaction.id });
        await enqueueOutbox(app.prisma, {
          storeId: transaction.storeId,
          topic: "transaction.cloud.sync",
          payload: { transactionId: transaction.id },
        });
      }
      // Inventory auto-deduction (best effort): do not block sale on failure
      const lineItems = transaction.lineItems
        .filter((l) => l.itemId)
        .map((l) => {
          let baseType: "HOT" | "ICED" | "CONCENTRATED" | undefined;
          let sizeCode: string | undefined;
          if (l.optionsJson) {
            try {
              const opts = JSON.parse(l.optionsJson) as Array<{
                type?: string;
                baseType?: string;
                sizeLabel?: string;
              }>;
              const sizeOpt = opts.find((o) => o.type === "size" && o.baseType && o.sizeLabel);
              if (sizeOpt) {
                const bt = sizeOpt.baseType as "HOT" | "ICED" | "CONCENTRATED";
                if (bt === "HOT" || bt === "ICED" || bt === "CONCENTRATED") {
                  baseType = bt;
                  sizeCode = sizeOpt.sizeLabel;
                }
              }
            } catch {
              // Ignore malformed JSON; fall back to non-sized recipes
            }
          }
          return {
            itemId: l.itemId!,
            qty: l.qty,
            baseType,
            sizeCode,
          };
        });
      if (lineItems.length > 0) {
        try {
          await app.inventoryService.consumeForSale({
            storeId: transaction.storeId,
            transactionId: transaction.id,
            lineItems,
            createdByStaffId: staff?.id,
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
              lineItems,
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

    // Sync void to cloud
    const paymentsList = voided.payments.map((p) => ({ method: p.method, amountCents: p.amountCents }));
    const lineItemsList = voided.lineItems.map((l) => ({ name: l.name, qty: l.qty, lineTotal: l.lineTotal }));
    const uploadResult = await uploadTransactionToCloud(app.prisma, voided, paymentsList, lineItemsList);
    if (!uploadResult.ok) {
      console.log("[TransactionSync] Transaction queued for cloud sync (retry)", { transactionId: voided.id });
      await enqueueOutbox(app.prisma, {
        storeId: voided.storeId,
        topic: "transaction.cloud.sync",
        payload: { transactionId: voided.id },
      });
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
            item: { select: { cloudId: true } },
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
        select: { businessName: true, address: true, snapResiboEnabled: true, snapResiboPriceCents: true },
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
    if (cloudIds.length > 0) {
      const cloudItems = await app.prisma.cloudMenuItem.findMany({
        where: { cloudId: { in: cloudIds } },
        select: { cloudId: true, categoryCloudId: true, subCategoryCloudId: true },
      });
      for (const row of cloudItems) {
        categoryByCloudId.set(row.cloudId, row.categoryCloudId);
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
      const displayLabel = formatTransactionLineLabel({
        name: li.name,
        optionsJson: li.optionsJson,
        categoryName: categoryName ?? undefined,
        subCategoryName: subCategoryName ?? undefined,
        qty: li.qty,
        includeQuantity: true,
      });
      return {
        ...li,
        categoryCloudId,
        categoryName: categoryName ?? undefined,
        subCategoryName: subCategoryName ?? undefined,
        displayLabel,
      };
    });
    const receiptHeader =
      storeConfig && (storeConfig.businessName || storeConfig.address)
        ? {
            businessName: storeConfig.businessName ?? null,
            address: storeConfig.address ?? null,
          }
        : undefined;

    let snapResiboVouchers: Array<{ voucherId: string; pricePhp: number }> = [];
    if (storeConfig?.snapResiboEnabled) {
      const linked = await getVouchersForTransaction(app.prisma, id);
      if (linked.length > 0) {
        const pricePhp = Math.floor((storeConfig.snapResiboPriceCents ?? 0) / 100);
        snapResiboVouchers = linked.slice(0, 1).map((v) => ({
          voucherId: v.voucherId,
          pricePhp: v.source === "PAID_ITEM" ? pricePhp : 0,
        }));
      }
    }

    return {
      ...transaction,
      lineItems: lineItemsWithCategory,
      ...(receiptHeader && { businessName: receiptHeader.businessName, address: receiptHeader.address }),
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
    const storeConfig = await app.prisma.storeConfig.findUnique({
      where: { storeId: STORE_ID },
      select: {
        businessName: true,
        address: true,
        snapResiboEnabled: true,
        snapResiboPriceCents: true,
        snapResiboRewardMinimumCents: true,
      },
    });
    const receiptHeader =
      storeConfig && (storeConfig.businessName || storeConfig.address)
        ? {
            businessName: storeConfig.businessName ?? null,
            address: storeConfig.address ?? null,
          }
        : undefined;

    const txForPrint = {
      ...transaction,
      createdAt:
        transaction.createdAt instanceof Date
          ? transaction.createdAt.toISOString()
          : String(transaction.createdAt),
    };

    let vouchersForPrint: Array<{ voucherId: string; pricePhp: number }> = [];
    let snapResiboError: string | null = null;

    if (storeConfig?.snapResiboEnabled) {
      const pricePhp = Math.floor((storeConfig.snapResiboPriceCents ?? 0) / 100);
      const hasPaidSnapResiboLine = transaction.lineItems.some(
        (li) => li.name.trim().toLowerCase() === "snapresibo qr" && li.lineTotal > 0
      );
      const qualifiesReward =
        (storeConfig.snapResiboRewardMinimumCents ?? 0) > 0 &&
        transaction.totalCents >= (storeConfig.snapResiboRewardMinimumCents ?? 0);
      const expectsVoucher = hasPaidSnapResiboLine || qualifiesReward;

      const linked = await getVouchersForTransaction(app.prisma, transaction.id);
      if (linked.length > 0) {
        // V1: max one voucher per transaction; use first linked only (reprint must show same voucher)
        const one = linked.slice(0, 1);
        vouchersForPrint = one.map((v) => ({
          voucherId: v.voucherId,
          pricePhp: v.source === "PAID_ITEM" ? pricePhp : 0,
        }));
      } else if (expectsVoucher) {
        snapResiboError = "NO_VOUCHER_LINKED";
      }
    }

    try {
      await printReceiptToDevice(txForPrint, receiptHeader, vouchersForPrint.length > 0 ? vouchersForPrint : undefined);
      return snapResiboError ? { ok: true, snapResiboError } : { ok: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err ?? "Receipt print failed");
      app.log.error({ err, transactionId: id }, "Print receipt failed");
      reply.code(500);
      return { error: "PRINT_FAILED", message };
    }
  });

  // Direct print stickers (local printer, no browser); uses store stickerPrintCategoryIds and line categoryCloudId
  app.post("/pos/transactions/:id/print-stickers", async (req, reply) => {
    const { id } = req.params as { id: string };
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
    const storeConfig = await app.prisma.storeConfig.findUnique({
      where: { storeId: STORE_ID },
    });
    const stickerPrintCategoryIds = storeConfig?.stickerPrintCategoryIds
      ? (JSON.parse(storeConfig.stickerPrintCategoryIds) as string[])
      : [];
    const cloudIds = [
      ...new Set(
        transaction.lineItems.map((li) => li.item?.cloudId).filter((c): c is string => !!c)
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
    const enrichedLineItems = transaction.lineItems.map((li) => ({
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
      const result = await printStickersToDevice(txForPrint, { stickerPrintCategoryIds });
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
}
