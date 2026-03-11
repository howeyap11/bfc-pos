// apps/api/src/index.ts
import "dotenv/config";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || String(v).trim() === "") {
    console.error(`[boot] missing required env: ${name}`);
    process.exit(1);
  }
  return v;
}

const mode = process.env.NODE_ENV || "development";
const port = parseInt(process.env.PORT ?? "4000", 10);
const databaseUrl = requireEnv("DATABASE_URL");
const dbPath = databaseUrl.startsWith("file:")
  ? databaseUrl.replace(/^file:/, "").replace(/^(\.\/)/, "")
  : "[url]";

import Fastify from "fastify";
import cors from "@fastify/cors";

import prismaPlugin from "./plugins/prisma";
import inventoryServicePlugin from "./plugins/inventoryService";
import { staffGuardPlugin } from "./plugins/staffGuard";
import { staffRoutesPlugin } from "./routes/staff";
import { staffQueueRoutes } from "./routes/staffQueue";
import { posOrdersRoutes } from "./routes/posOrders";
import { orderStatusRoutes } from "./routes/orderStatus";
import { functionRoomRoutes } from "./routes/functionRoom";
import { orderCancelRoutes } from "./routes/orderCancel";
import { qrAcceptRoutes } from "./routes/qrAccept";
import { registerRoutes } from "./routes/register";
import { posTransactionsRoutes } from "./routes/posTransactions";
import { drawerRoutes } from "./routes/drawer";
import { adminSyncRoutes } from "./routes/admin/adminSync";
import { storeConfigRoutes } from "./routes/storeConfig";
import { ensureItemForCloudId } from "./services/catalogCache.service";
import { syncCatalogFromCloud } from "./services/syncCatalog.service.js";
import { startSyncScheduler, runTransactionSyncFlush } from "./services/syncScheduler.js";
import { startDeviceCommandPolling } from "./services/deviceCommandPolling.service.js";
import { getCommandState } from "./services/commandState.service.js";

const app = Fastify({ logger: true });

// Plugins
await app.register(cors, { origin: true });
await app.register(prismaPlugin);
await app.register(inventoryServicePlugin);
await app.register(staffGuardPlugin);

// Staff routes (some public: /staff, /staff/login, /staff/verify-admin-pin)
await app.register(staffRoutesPlugin);
// Staff routes (protected by x-staff-key inside the route files)
await app.register(staffQueueRoutes);
await app.register(posOrdersRoutes);
await app.register(orderStatusRoutes);
await app.register(functionRoomRoutes);
await app.register(orderCancelRoutes);
await app.register(qrAcceptRoutes);
await app.register(registerRoutes);
await app.register(posTransactionsRoutes);
await app.register(drawerRoutes);
await app.register(adminSyncRoutes);
await app.register(storeConfigRoutes);

// Public routes (MUST be before listen)
app.get("/health", async () => ({ ok: true }));

app.get("/device/status", async () => {
  const { state: commandState, errorMessage } = getCommandState();
  return {
    version: process.env.POS_VERSION ?? "1.0.0",
    deviceConfigured: !!process.env.DEVICE_KEY,
    commandState,
    ...(errorMessage && { errorMessage }),
  };
});

app.get("/ready", async (req, reply) => {
  try {
    await app.prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  } catch (err) {
    app.log.warn({ err }, "ready check failed");
    return reply.code(503).send({ ok: false });
  }
});

app.get("/tables", async () => {
  return app.prisma.table.findMany({
    where: { isActive: true },
    include: { zone: true },
  });
});

// Catalog from local cache - offline-first, no cloud dependency
// Returns Category[] with items, using CloudCategory, CloudSubCategory, CloudMenuItem
app.get("/menu", async (req, reply) => {
  try {
    const [categories, subCategories, items] = await Promise.all([
      app.prisma.cloudCategory.findMany({
        where: { storeId: "store_1" },
        orderBy: { sortOrder: "asc" },
      }),
      app.prisma.cloudSubCategory.findMany({
        where: { storeId: "store_1" },
        orderBy: { sortOrder: "asc" },
      }),
      app.prisma.cloudMenuItem.findMany({
        where: { storeId: "store_1", isActive: true, deletedAt: null },
        orderBy: { name: "asc" },
      }),
    ]);
    const subCategoryMap = new Map((subCategories ?? []).map((s) => [s.cloudId, s.name]));
    const result = (categories ?? []).map((cat) => ({
      id: cat.cloudId,
      name: cat.name,
      items: (items ?? [])
        .filter((i) => i.categoryCloudId === cat.cloudId)
      .map((i) => ({
        id: i.cloudId,
        name: i.name,
        basePrice: i.priceCents,
        description: null,
        imageUrl: i.imageUrl,
        series: i.subCategoryCloudId ? subCategoryMap.get(i.subCategoryCloudId) ?? "Other" : "Other",
        })),
    }));
    const uncategorized = (items ?? []).filter((i) => !i.categoryCloudId);
    if (uncategorized.length > 0) {
      result.push({
      id: "_uncategorized",
      name: "Uncategorized",
      items: uncategorized.map((i) => ({
        id: i.cloudId,
        name: i.name,
        basePrice: i.priceCents,
        description: null,
        imageUrl: i.imageUrl,
        series: i.subCategoryCloudId ? subCategoryMap.get(i.subCategoryCloudId) ?? "Other" : "Other",
      })),
      });
    }
    if (result.length === 0 && (items ?? []).length > 0) {
      return [{ id: "menu", name: "Menu", items: (items ?? []).map((i) => ({ id: i.cloudId, name: i.name, basePrice: i.priceCents, description: null, imageUrl: i.imageUrl ?? null, series: "Other" })) }];
    }
    return result;
  } catch (err) {
    app.log.error({ err }, "[Menu] Error loading menu");
    return reply.code(500).send({ error: "MENU_LOAD_FAILED", message: "Failed to load menu" });
  }
});

// Transaction types (For Here, To Go, FoodPanda, etc.)
app.get("/transaction-types", async (req, reply) => {
  try {
    const rows = await app.prisma.cloudTransactionType.findMany({
      where: { storeId: "store_1", isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return (rows ?? []).map((t) => ({
      id: t.cloudId,
      code: t.code,
      label: t.label,
      priceDeltaCents: t.priceDeltaCents,
    }));
  } catch (err) {
    app.log.error({ err }, "[TransactionTypes] Error loading transaction types");
    return reply.code(500).send({ error: "TRANSACTION_TYPES_LOAD_FAILED", message: "Failed to load transaction types" });
  }
});

// Shot pricing rules (bundle pricing for extra shots)
app.get("/shot-pricing-rules", async () => {
  const rows = await app.prisma.cloudShotPricingRule.findMany({
    where: { storeId: "store_1", isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((r) => ({
    id: r.cloudId,
    name: r.name,
    shotsPerBundle: r.shotsPerBundle,
    priceCentsPerBundle: r.priceCentsPerBundle,
  }));
});

app.get("/items/:id", async (req) => {
  const { id } = req.params as { id: string };

  // id is cloudId from menu; also support legacy Item.id for backward compat
  const cloud = await app.prisma.cloudMenuItem.findUnique({
    where: { cloudId: id },
  });

  if (cloud && !cloud.deletedAt) {
    const storeId = cloud.storeId;
    const links = await app.prisma.cloudMenuItemOptionGroup.findMany({
      where: { menuItemCloudId: cloud.cloudId, storeId },
    });
    const groupCloudIds = [...new Set(links.map((l) => l.groupCloudId))];
    const [groups, sections] = await Promise.all([
      app.prisma.cloudMenuOptionGroup.findMany({
        where: { cloudId: { in: groupCloudIds }, storeId },
      }),
      app.prisma.cloudMenuOptionGroupSection.findMany({
        where: { optionGroupCloudId: { in: groupCloudIds }, storeId },
        orderBy: { sortOrder: "asc" },
      }),
    ]);
    const options = await app.prisma.cloudMenuOption.findMany({
      where: { groupCloudId: { in: groupCloudIds }, storeId },
    });
    const groupMap = new Map(groups.map((g) => [g.cloudId, g]));
    const sectionsByGroup = new Map<string, typeof sections>();
    for (const s of sections) {
      const list = sectionsByGroup.get(s.optionGroupCloudId) ?? [];
      list.push(s);
      sectionsByGroup.set(s.optionGroupCloudId, list);
    }
    const optionsByGroup = new Map<string, typeof options>();
    for (const o of options) {
      const list = optionsByGroup.get(o.groupCloudId) ?? [];
      list.push(o);
      optionsByGroup.set(o.groupCloudId, list);
    }

    // Per-item drink sizes by mode (only show sizes enabled for this item)
    const drinkConfigs = await app.prisma.cloudMenuItemDrinkSizeConfig.findMany({
      where: { menuItemCloudId: cloud.cloudId, storeId },
    });
    const optionIdsFromConfigs = [...new Set(drinkConfigs.map((c) => c.optionCloudId))];
    const [sizeOptions, sizePrices] = await Promise.all([
      app.prisma.cloudMenuOption.findMany({
        where: { cloudId: { in: optionIdsFromConfigs }, storeId },
      }),
      app.prisma.cloudMenuItemSizePrice.findMany({
        where: { menuItemCloudId: cloud.cloudId, storeId },
      }),
    ]);
    const optionNameMap = new Map(sizeOptions.map((o) => [o.cloudId, o.name]));
    const priceMap = new Map(
      sizePrices.map((p) => [`${p.baseType}|${p.sizeOptionCloudId}`, p.priceCents] as const)
    );
    const MODES = ["HOT", "ICED", "CONCENTRATED"] as const;
    const sizesByMode: Record<
      string,
      Array<{ id: string; name: string; priceCents?: number }>
    > = { HOT: [], ICED: [], CONCENTRATED: [] };
    for (const c of drinkConfigs) {
      const modeKey = (c.mode || "").toUpperCase();
      if (!MODES.includes(modeKey as (typeof MODES)[number])) continue;
      const name = optionNameMap.get(c.optionCloudId);
      if (name) {
        const priceKey = `${modeKey}|${c.optionCloudId}`;
        const priceCents = priceMap.get(priceKey);
        sizesByMode[modeKey].push({ id: c.optionCloudId, name, priceCents: priceCents ?? undefined });
      }
    }
    const hasSizes = drinkConfigs.length > 0 || cloud.hasSizes;

    // [DEBUG] Temporary - remove after verifying size UI
    if (process.env.NODE_ENV !== "production" && drinkConfigs.length > 0) {
      const hot = sizesByMode.HOT?.length ?? 0;
      const iced = sizesByMode.ICED?.length ?? 0;
      const conc = sizesByMode.CONCENTRATED?.length ?? 0;
      app.log.info(
        { itemId: cloud.cloudId, drinkConfigs: drinkConfigs.length, hasSizes, hot, iced, conc },
        "[items/:id] sizesByMode counts"
      );
    }

    const itemOptionGroups = links.map((link) => {
      const g = groupMap.get(link.groupCloudId);
      if (!g) return null;
      const groupSections = (sectionsByGroup.get(g.cloudId) ?? []).map((s) => ({ id: s.cloudId, key: s.key, label: s.label, sortOrder: s.sortOrder }));
      const defaultOptCloudId = (g as { defaultOptionCloudId?: string | null }).defaultOptionCloudId ?? (cloud as { defaultSizeOptionCloudId?: string | null }).defaultSizeOptionCloudId;
      const opts = (optionsByGroup.get(g.cloudId) ?? []).map((o) => ({
        id: o.cloudId,
        name: o.name,
        priceDelta: o.priceDelta,
        isDefault: defaultOptCloudId === o.cloudId,
      }));
      return {
        group: {
          id: g.cloudId,
          name: g.name,
          type: g.multi ? ("MULTI" as const) : ("SINGLE" as const),
          minSelect: g.required ? 1 : 0,
          maxSelect: g.multi ? 999 : 1,
          isRequired: g.required,
          isSizeGroup: g.isSizeGroup,
          defaultOptionId: defaultOptCloudId ?? null,
          sections: groupSections.length > 0 ? groupSections : undefined,
          options: opts,
        },
      };
    }).filter(Boolean) as Array<{ group: { id: string; name: string; type: "SINGLE" | "MULTI"; minSelect: number; maxSelect: number; isRequired: boolean; defaultOptionId: string | null; sections?: Array<{ id: string; key: string; label: string; sortOrder: number }>; options: Array<{ id: string; name: string; priceDelta: number; isDefault: boolean }> } }>;

    const defaultShots = (cloud as { defaultShots?: number | null }).defaultShots ?? 0;
    const supportsShots = (cloud as { supportsShots?: boolean }).supportsShots ?? false;

    // Active shot pricing rule (for cloud items: apply to shots above default)
    let shotPricingRule: { shotsPerBundle: number; priceCentsPerBundle: number } | undefined;
    if (supportsShots) {
      const rule = await app.prisma.cloudShotPricingRule.findFirst({
        where: { storeId, isActive: true },
        orderBy: { sortOrder: "asc" },
      });
      if (rule) {
        shotPricingRule = { shotsPerBundle: rule.shotsPerBundle, priceCentsPerBundle: rule.priceCentsPerBundle };
      }
    }

    // Recipe consumption for future inventory deduction (optional)
    const [recipeLines, recipeLineSizes, addOnLinks, substituteLinks, addOns, substitutes] = await Promise.all([
      app.prisma.cloudRecipeLine.findMany({
        where: { menuItemCloudId: cloud.cloudId, storeId, deletedAt: null },
        select: { ingredientCloudId: true, qtyPerItem: true, unitCode: true },
      }),
      app.prisma.cloudRecipeLineSize.findMany({
        where: { menuItemCloudId: cloud.cloudId, storeId, deletedAt: null },
        select: { ingredientCloudId: true, baseType: true, sizeCode: true, qtyPerItem: true, unitCode: true },
      }),
      app.prisma.cloudMenuItemAddOn.findMany({
        where: { menuItemCloudId: cloud.cloudId, storeId },
      }),
      app.prisma.cloudMenuItemSubstitute.findMany({
        where: { menuItemCloudId: cloud.cloudId, storeId },
      }),
      app.prisma.cloudAddOn.findMany({ where: { storeId }, orderBy: { sortOrder: "asc" } }),
      app.prisma.cloudSubstitute.findMany({ where: { storeId }, include: { prices: true, recipeConsumption: true }, orderBy: { sortOrder: "asc" } }),
    ]);
    const addOnIds = new Set(addOnLinks.map((l) => l.addOnCloudId));
    const substituteIds = new Set(substituteLinks.map((l) => l.substituteCloudId));
    const itemAddOns = addOns.filter((a) => addOnIds.has(a.cloudId)).map((a) => ({ id: a.cloudId, name: a.name, priceCents: a.priceCents }));
    const itemSubstitutes = substitutes.filter((s) => substituteIds.has(s.cloudId)).map((s) => {
      const sub = s as {
        cloudId: string;
        name: string;
        priceCents: number;
        prices?: Array<{ sizeCloudId: string; mode: string; priceCents: number }>;
        recipeConsumption?: Array<{ sizeCloudId: string; mode: string; ingredientCloudId: string; qtyPerItem: string; unitCode: string }>;
      };
      return {
        id: sub.cloudId,
        name: sub.name,
        priceCents: sub.priceCents,
        prices: (sub.prices ?? []).map((p) => ({ sizeCloudId: p.sizeCloudId, mode: p.mode, priceCents: p.priceCents })),
        recipeConsumption: (sub.recipeConsumption ?? []).map((r) => ({
          sizeCloudId: r.sizeCloudId,
          mode: r.mode,
          ingredientCloudId: r.ingredientCloudId,
          qtyPerItem: r.qtyPerItem,
          unitCode: r.unitCode,
        })),
      };
    });
    const defaultSubId = (cloud as { defaultSubstituteCloudId?: string | null }).defaultSubstituteCloudId ?? null;

    return {
      id: cloud.cloudId,
      name: cloud.name,
      basePrice: cloud.priceCents,
      description: null,
      imageUrl: cloud.imageUrl,
      isDrink: cloud.isDrink,
      serveVessel: cloud.serveVessel,
      defaultSizeOptionId: (cloud as { defaultSizeOptionCloudId?: string | null }).defaultSizeOptionCloudId ?? null,
      defaultMilk: "FULL_CREAM",
      defaultSubstituteCloudId: defaultSubId,
      substitutes: itemSubstitutes.length > 0 ? itemSubstitutes : undefined,
      addOns: itemAddOns.length > 0 ? itemAddOns : undefined,
      supportsShots,
      defaultShots12oz: defaultShots,
      defaultShots16oz: defaultShots,
      shotPricingRule,
      itemOptionGroups,
      hasSizes: hasSizes || undefined,
      sizesByMode: hasSizes ? sizesByMode : undefined,
      recipeLines: recipeLines.length > 0 || recipeLineSizes.length > 0
        ? { base: recipeLines.map((r) => ({ ingredientCloudId: r.ingredientCloudId, qtyPerItem: r.qtyPerItem.toString(), unitCode: r.unitCode })), bySize: recipeLineSizes.map((r) => ({ ingredientCloudId: r.ingredientCloudId, baseType: r.baseType, sizeCode: r.sizeCode, qtyPerItem: r.qtyPerItem.toString(), unitCode: r.unitCode })) }
        : undefined,
    };
  }

  // Fallback: legacy Item (for existing URLs or mixed use)
  const item = await app.prisma.item.findUnique({
    where: { id },
    include: {
      itemOptionGroups: {
        include: {
          group: {
            include: {
              options: { orderBy: { sort: "asc" } },
            },
          },
        },
      },
    },
  });

  if (!item) {
    return { error: "NOT_FOUND" };
  }

  return item;
});

app.post("/orders", async (req) => {
  const body = req.body as {
    tablePublicKey: string;
    paymentMethod?: "CASH" | "GCASH_MANUAL" | "PAYMONGO";
    customerNote?: string;
    items: Array<{
      itemId: string;
      qty: number;
      note?: string;
      optionIds: string[];
    }>;
  };

  if (!body?.tablePublicKey) return { error: "MISSING_TABLE" };
  if (!Array.isArray(body.items) || body.items.length === 0) return { error: "EMPTY_ITEMS" };

  const table = await app.prisma.table.findUnique({
    where: { publicKey: body.tablePublicKey },
    include: { zone: true },
  });
  if (!table) return { error: "TABLE_NOT_FOUND" };

  const last = await app.prisma.order.findFirst({
    orderBy: { orderNo: "desc" },
    select: { orderNo: true },
  });
  const nextNo = (last?.orderNo ?? 0) + 1;

  // itemId from QR menu is cloudId; resolve to Item.id for OrderItem
  const cloudIds = [...new Set(body.items.map((i) => i.itemId))];
  const optionIds = [...new Set(body.items.flatMap((i) => i.optionIds ?? []))];

  const resolvedIds: string[] = [];
  for (const cid of cloudIds) {
    try {
      resolvedIds.push(await ensureItemForCloudId(app.prisma, cid));
    } catch {
      throw new Error(`Invalid itemId: ${cid}`);
    }
  }

  const dbItems = await app.prisma.item.findMany({
    where: { id: { in: resolvedIds } },
    select: { id: true, cloudId: true, basePrice: true },
  });
  const itemMap = new Map<string, (typeof dbItems)[0]>();
  for (const i of dbItems) {
    itemMap.set(i.id, i);
    if (i.cloudId) itemMap.set(i.cloudId, i);
  }

  const dbOptions = await app.prisma.option.findMany({
    where: { id: { in: optionIds } },
    select: { id: true, priceDelta: true },
  });
  const optionMap = new Map(dbOptions.map((o) => [o.id, o]));
  
  let source: any = "QR_UNPAID";
  let paymentMethod: any = (body.paymentMethod ?? "CASH");
  let paymentStatus: any = "UNPAID";
  let tabId: string | null = null;

  // If order is from function room zone and FR tab is open, attach it
  if (table.zone.code === "FR" && table.isFunctionRoom) {
    const frTab = await app.prisma.tab.findFirst({
      where: { status: "OPEN", type: "FUNCTION_ROOM" },
      orderBy: { openedAt: "desc" },
    });

    if (frTab) {
      source = "FUNCTION_ROOM";
      tabId = frTab.id;
      paymentMethod = "TO_BE_DECIDED";
      paymentStatus = "UNPAID";
    }
  }

  const created = await app.prisma.order.create({
    data: {
      orderNo: nextNo,
      tableId: table.id,
      status: "PLACED",
      source,
      tabId,
      paymentMethod,
      paymentStatus,
      customerNote: body.customerNote?.trim() || null,
      items: {
        create: body.items.map((it) => {
          const dbItem = itemMap.get(it.itemId);
          if (!dbItem) throw new Error(`Invalid itemId: ${it.itemId}`);

          const optIds = it.optionIds ?? [];
          const unitPrice =
            dbItem.basePrice +
            optIds.reduce((sum, oid) => sum + (optionMap.get(oid)?.priceDelta ?? 0), 0);

          return {
            itemId: dbItem.id,
            qty: Math.max(1, it.qty || 1),
            unitPrice,
            lineNote: it.note?.trim() || null,
            options: {
              create: optIds.map((oid) => {
                const opt = optionMap.get(oid);
                if (!opt) throw new Error(`Invalid optionId: ${oid}`);
                return { optionId: oid, priceDelta: opt.priceDelta };
              }),
            },
          };
        }),
      },
    },
    include: {
      table: { include: { zone: true } },
      items: {
        include: {
          item: { include: { category: true } },
          options: { include: { option: { include: { group: true } } } },
        },
      },
    },
  });

  return created;
});

// NOTE:
// DO NOT define app.get("/queue") here
// DO NOT define app.patch("/orders/:id/status") here
// Those are provided by staffQueueRoutes + orderStatusRoutes

// Graceful shutdown
async function shutdown(sig: string) {
  app.log.info({ signal: sig }, "shutting down");
  try {
    await app.close();
    process.exit(0);
  } catch (err) {
    app.log.error({ err }, "shutdown error");
    process.exit(1);
  }
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

try {
  await app.listen({ host: "0.0.0.0", port });
  app.log.info({ port, dbPath, mode }, "API started");

  startSyncScheduler(app);
  startDeviceCommandPolling(app);

  syncCatalogFromCloud(app.prisma, "default")
    .then((outcome) => {
      if (outcome.ok) {
        app.log.info({ result: outcome.result }, "Catalog sync completed on startup");
      } else {
        app.log.warn({ error: outcome.error, code: outcome.code }, "Catalog sync skipped on startup");
      }
    })
    .catch((err) => {
      app.log.warn({ err }, "Catalog sync failed on startup");
    });

  setTimeout(() => runTransactionSyncFlush(app).catch(() => {}), 5000);
} catch (err) {
  console.error("[boot] startup failed:", err);
  process.exit(1);
}
