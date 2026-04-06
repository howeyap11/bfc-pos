// apps/api/src/routes/storeConfig.ts
import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { requireStaffHook } from "../plugins/staffGuard.js";
import { verifyAdminPin } from "../services/adminPin.service.js";

const STORE_ID = "store_1";

export type TabletNavConfig = {
  showPending: boolean;
  showQr: boolean;
  showKitchen: boolean;
  showStaff: boolean;
};

function defaultTabletNav(): TabletNavConfig {
  return { showPending: true, showQr: true, showKitchen: true, showStaff: true };
}

export function parseTabletNavJson(raw: string | null | undefined): TabletNavConfig {
  if (!raw?.trim()) return defaultTabletNav();
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const d = defaultTabletNav();
    return {
      showPending: typeof o.showPending === "boolean" ? o.showPending : d.showPending,
      showQr: typeof o.showQr === "boolean" ? o.showQr : d.showQr,
      showKitchen: typeof o.showKitchen === "boolean" ? o.showKitchen : d.showKitchen,
      showStaff: typeof o.showStaff === "boolean" ? o.showStaff : d.showStaff,
    };
  } catch {
    return defaultTabletNav();
  }
}

/** Body is only business name/address (Cloud Admin Business Details page). */
function isBusinessDetailsOnly(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const keys = Object.keys(body as Record<string, unknown>).filter((k) => (body as Record<string, unknown>)[k] !== undefined);
  return keys.length > 0 && keys.every((k) => k === "businessName" || k === "address");
}

/** Body is only devMode (POS Settings Dev Mode toggle – behind PIN gate, no staff key required). */
function isDevModeOnly(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const keys = Object.keys(body as Record<string, unknown>).filter((k) => (body as Record<string, unknown>)[k] !== undefined);
  return keys.length > 0 && keys.every((k) => k === "devMode");
}

/** Allow PUT if: staff auth, admin key, body only businessName/address (no auth), or body only devMode (no auth). */
async function allowStaffOrStoreConfigAdmin(req: FastifyRequest, reply: FastifyReply) {
  const body = (req as { body?: unknown }).body;
  const onlyBusinessDetails = isBusinessDetailsOnly(body);
  if (onlyBusinessDetails) return;
  const onlyDevMode = isDevModeOnly(body);
  if (onlyDevMode) return;

  const adminKey = process.env.STORE_CONFIG_ADMIN_KEY;
  const incoming = (req.headers["x-store-config-admin-key"] as string) ?? "";
  const keyMatch = typeof adminKey === "string" && adminKey.length > 0 && incoming.trim() === adminKey.trim();
  if (keyMatch) return;
  await requireStaffHook(req, reply);
}

const storeConfigRoutesImpl: FastifyPluginAsync = async (app) => {
  // GET /store-config - Get store configuration (public, no auth required)
  app.get("/store-config", async (req, reply) => {
    try {
      const config = await app.prisma.storeConfig.findUnique({
        where: { storeId: STORE_ID },
      });

      if (!config) {
        return {
          storeId: STORE_ID,
          enabledPaymentMethods: ["CASH"],
          splitPaymentEnabled: true,
          paymentMethodOrder: null,
          stickerPrintCategoryIds: [] as string[],
          businessName: null as string | null,
          address: null as string | null,
          receiptTaxType: null as string | null,
          receiptNonVatTin: null as string | null,
          receiptVatTin: null as string | null,
          receiptBirMin: null as string | null,
          receiptBirSerialNo: null as string | null,
          devMode: false,
          snapResiboEnabled: false,
          snapResiboPriceCents: null as number | null,
          snapResiboRewardMinimumCents: null as number | null,
          tabletNav: defaultTabletNav(),
          qrMenuEnabled: true,
        };
      }

      const enabledPaymentMethods = JSON.parse(config.enabledPaymentMethods || "[]");
      const paymentMethodOrder = config.paymentMethodOrder ? JSON.parse(config.paymentMethodOrder) : null;
      const stickerPrintCategoryIds = config.stickerPrintCategoryIds
        ? (JSON.parse(config.stickerPrintCategoryIds) as string[])
        : [];

      /* tabletNavJson: safe if null, invalid JSON, or column missing on very old Prisma client — parseTabletNavJson covers all. */
      let tabletNav = defaultTabletNav();
      try {
        tabletNav = parseTabletNavJson((config as { tabletNavJson?: string | null }).tabletNavJson);
      } catch {
        tabletNav = defaultTabletNav();
      }

      return {
        storeId: config.storeId,
        enabledPaymentMethods,
        splitPaymentEnabled: config.splitPaymentEnabled ?? true,
        paymentMethodOrder,
        stickerPrintCategoryIds,
        businessName: config.businessName ?? null,
        address: config.address ?? null,
        receiptTaxType: config.receiptTaxType ?? null,
        receiptNonVatTin: config.receiptNonVatTin ?? null,
        receiptVatTin: config.receiptVatTin ?? null,
        receiptBirMin: config.receiptBirMin ?? null,
        receiptBirSerialNo: config.receiptBirSerialNo ?? null,
        devMode: config.devMode ?? false,
        snapResiboEnabled: config.snapResiboEnabled ?? false,
        snapResiboPriceCents: config.snapResiboPriceCents ?? null,
        snapResiboRewardMinimumCents: config.snapResiboRewardMinimumCents ?? null,
        tabletNav,
        qrMenuEnabled: config.qrMenuEnabled !== false,
      };
    } catch (err) {
      app.log.error({ err }, "[StoreConfig] Error loading config");
      return reply.code(500).send({ error: "STORE_CONFIG_LOAD_FAILED", message: "Failed to load store config" });
    }
  });

  // PUT /store-config - Update store configuration (staff auth or cloud admin key)
  app.put(
    "/store-config",
    {
      preHandler: allowStaffOrStoreConfigAdmin,
    },
    async (req, reply) => {
      const body = req.body as {
        enabledPaymentMethods?: string[];
        splitPaymentEnabled?: boolean;
        paymentMethodOrder?: string[] | null;
        stickerPrintCategoryIds?: string[] | null;
        businessName?: string | null;
        address?: string | null;
        devMode?: boolean;
        snapResiboEnabled?: boolean;
        snapResiboPriceCents?: number | string | null;
        snapResiboRewardMinimumCents?: number | string | null;
        qrMenuEnabled?: boolean;
      };

      const updateData: Record<string, unknown> = {};

      if (body.enabledPaymentMethods !== undefined) {
        updateData.enabledPaymentMethods = JSON.stringify(body.enabledPaymentMethods);
      }

      if (body.splitPaymentEnabled !== undefined) {
        updateData.splitPaymentEnabled = body.splitPaymentEnabled;
      }

      if (body.paymentMethodOrder !== undefined) {
        updateData.paymentMethodOrder = body.paymentMethodOrder ? JSON.stringify(body.paymentMethodOrder) : null;
      }

      if (body.stickerPrintCategoryIds !== undefined) {
        updateData.stickerPrintCategoryIds = Array.isArray(body.stickerPrintCategoryIds)
          ? JSON.stringify(body.stickerPrintCategoryIds)
          : null;
      }

      if (body.businessName !== undefined) {
        updateData.businessName = body.businessName?.trim() || null;
      }

      if (body.address !== undefined) {
        updateData.address = body.address?.trim() || null;
      }

      if (body.devMode !== undefined) {
        updateData.devMode = !!body.devMode;
      }

      if (body.snapResiboEnabled !== undefined) {
        updateData.snapResiboEnabled = !!body.snapResiboEnabled;
      }
      if (body.snapResiboPriceCents !== undefined) {
        const v = body.snapResiboPriceCents;
        updateData.snapResiboPriceCents = v == null || v === "" ? null : Math.max(0, Math.trunc(Number(v)));
      }
      if (body.snapResiboRewardMinimumCents !== undefined) {
        const v = body.snapResiboRewardMinimumCents;
        updateData.snapResiboRewardMinimumCents = v == null || v === "" ? null : Math.max(0, Math.trunc(Number(v)));
      }

      if (body.qrMenuEnabled !== undefined) {
        updateData.qrMenuEnabled = !!body.qrMenuEnabled;
      }

      let config;
      try {
        config = await app.prisma.storeConfig.upsert({
          where: { storeId: STORE_ID },
          update: updateData,
          create: {
            storeId: STORE_ID,
            enabledPaymentMethods: JSON.stringify(body.enabledPaymentMethods || ["CASH"]),
            splitPaymentEnabled: body.splitPaymentEnabled ?? true,
            paymentMethodOrder: body.paymentMethodOrder ? JSON.stringify(body.paymentMethodOrder) : null,
            stickerPrintCategoryIds: Array.isArray(body.stickerPrintCategoryIds)
              ? JSON.stringify(body.stickerPrintCategoryIds)
              : null,
            businessName: body.businessName?.trim() || null,
            address: body.address?.trim() || null,
            devMode: !!body.devMode,
            snapResiboEnabled: !!body.snapResiboEnabled,
            snapResiboPriceCents: body.snapResiboPriceCents != null ? Math.max(0, Math.trunc(Number(body.snapResiboPriceCents))) : null,
            snapResiboRewardMinimumCents: body.snapResiboRewardMinimumCents != null ? Math.max(0, Math.trunc(Number(body.snapResiboRewardMinimumCents))) : null,
            qrMenuEnabled: body.qrMenuEnabled !== undefined ? !!body.qrMenuEnabled : true,
          },
        });
      } catch (upsertErr) {
        throw upsertErr;
      }

      const stickerPrintCategoryIds = config.stickerPrintCategoryIds
        ? (JSON.parse(config.stickerPrintCategoryIds) as string[])
        : [];

      return {
        storeId: config.storeId,
        enabledPaymentMethods: JSON.parse(config.enabledPaymentMethods),
        splitPaymentEnabled: config.splitPaymentEnabled,
        paymentMethodOrder: config.paymentMethodOrder ? JSON.parse(config.paymentMethodOrder) : null,
        stickerPrintCategoryIds,
        businessName: config.businessName ?? null,
        address: config.address ?? null,
        receiptTaxType: config.receiptTaxType ?? null,
        receiptNonVatTin: config.receiptNonVatTin ?? null,
        receiptVatTin: config.receiptVatTin ?? null,
        receiptBirMin: config.receiptBirMin ?? null,
        receiptBirSerialNo: config.receiptBirSerialNo ?? null,
        devMode: config.devMode ?? false,
        snapResiboEnabled: config.snapResiboEnabled ?? false,
        snapResiboPriceCents: config.snapResiboPriceCents ?? null,
        snapResiboRewardMinimumCents: config.snapResiboRewardMinimumCents ?? null,
        tabletNav: parseTabletNavJson(config.tabletNavJson),
        qrMenuEnabled: config.qrMenuEnabled !== false,
      };
    }
  );

  /** Tablet nav visibility: admin PIN only (no staff session required). Local-first. */
  app.patch("/store-config/tablet-nav", async (req, reply) => {
    const body = req.body as { adminPin?: string; tabletNav?: unknown };
    const pin = (body.adminPin ?? "").trim();
    const pinResult = await verifyAdminPin(pin, app.prisma);
    if (!pinResult.valid) {
      return reply.code(401).send({ error: "INVALID_PIN", message: "Invalid admin PIN" });
    }
    const t = body.tabletNav;
    if (!t || typeof t !== "object") {
      return reply.code(400).send({ error: "INVALID_BODY", message: "tabletNav object required" });
    }
    const raw = t as Record<string, unknown>;
    const cur = await app.prisma.storeConfig.findUnique({ where: { storeId: STORE_ID } });
    const base = parseTabletNavJson(cur?.tabletNavJson ?? null);
    /* Only these four booleans are persisted — ignore any other keys. */
    const next: TabletNavConfig = {
      showPending: typeof raw.showPending === "boolean" ? raw.showPending : base.showPending,
      showQr: typeof raw.showQr === "boolean" ? raw.showQr : base.showQr,
      showKitchen: typeof raw.showKitchen === "boolean" ? raw.showKitchen : base.showKitchen,
      showStaff: typeof raw.showStaff === "boolean" ? raw.showStaff : base.showStaff,
    };
    await app.prisma.storeConfig.upsert({
      where: { storeId: STORE_ID },
      update: { tabletNavJson: JSON.stringify(next) },
      create: {
        storeId: STORE_ID,
        enabledPaymentMethods: JSON.stringify(["CASH", "CARD", "GCASH", "FOODPANDA"]),
        splitPaymentEnabled: true,
        tabletNavJson: JSON.stringify(next),
      },
    });
    return { ok: true, tabletNav: next };
  });
};

export const storeConfigRoutes = fp(storeConfigRoutesImpl, { name: "storeConfigRoutes", dependencies: ["prisma"] });
