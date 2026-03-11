import { buffer } from "node:stream/consumers";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { uploadImage } from "../services/r2.service.js";
import { bumpCatalogVersion } from "../lib/catalogVersion.js";
import { hashPassword } from "../lib/password.js";
import { getDrinkSizesOptionGroup, getDrinkSizesOptionIds } from "../lib/drinkSizes.js";
function generateSlug(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[\s_]+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
}
async function ensureUniqueSlug(prisma, baseSlug, excludeId) {
    let slug = baseSlug || "category";
    let suffix = 2;
    while (true) {
        const existing = await prisma.category.findUnique({ where: { slug } });
        if (!existing || (excludeId && existing.id === excludeId))
            break;
        slug = `${baseSlug}-${suffix}`;
        suffix++;
    }
    return slug;
}
function extFromMime(mime) {
    const map = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
    };
    return map[mime] ?? "jpg";
}
async function adminAuthHook(req, reply) {
    try {
        await req.jwtVerify();
    }
    catch {
        reply.code(401);
        return reply.send({ error: "UNAUTHORIZED" });
    }
}
export async function adminRoutes(app) {
    app.addHook("preHandler", adminAuthHook);
    // Admin PIN (Settings > Password & PIN Codes)
    app.get("/settings/admin-pin", async () => {
        const row = await app.prisma.storeSetting.upsert({
            where: { id: "1" },
            create: { id: "1", adminPinHash: null },
            update: {},
        });
        return { configured: !!row.adminPinHash };
    });
    app.put("/settings/admin-pin", async (req, reply) => {
        const parsed = z.object({ pin: z.string().length(4, "PIN must be 4 digits").regex(/^\d{4}$/, "PIN must be 4 digits").refine((v) => v[0] !== "0", "PIN cannot start with 0") }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_PIN", message: parsed.error.issues.map((issue) => issue.message).join("; ") };
        }
        const hash = await hashPassword(parsed.data.pin);
        await app.prisma.storeSetting.upsert({
            where: { id: "1" },
            create: { id: "1", adminPinHash: hash },
            update: { adminPinHash: hash },
        });
        return { ok: true };
    });
    // MenuItem CRUD - subCategoryId required
    const drinkTempEnum = z.enum(["HOT", "ICED", "ANY"]);
    const menuItemCreateSchema = z.object({
        name: z.string().min(1),
        priceCents: z.number().int().min(0),
        isActive: z.boolean().optional().default(true),
        imageUrl: z.string().optional().nullable(),
        subCategoryId: z.string().min(1),
        defaultSizeOptionId: z.string().optional().nullable(),
        sortOrder: z.number().int().optional(),
        hasSizes: z.boolean().optional().default(false),
        supportsShots: z.boolean().optional().default(false),
        defaultShots: z.number().int().min(0).optional().nullable(),
    });
    const menuItemUpdateSchema = z
        .object({
        name: z.string().min(1).optional(),
        priceCents: z.number().int().min(0).optional(),
        isActive: z.boolean().optional(),
        imageUrl: z.string().optional().nullable(),
        subCategoryId: z.string().min(1, "subCategoryId is required").optional(),
        defaultSizeOptionId: z.string().optional().nullable(),
        defaultSubstituteId: z.string().optional().nullable(),
        defaultSubstituteOptionId: z.string().optional().nullable(),
        sortOrder: z.number().int().optional(),
        hasSizes: z.boolean().optional(),
        supportsShots: z.boolean().optional(),
        defaultShots: z.number().int().min(0).optional().nullable(),
    })
        .partial();
    const reorderOrderSchema = z.object({
        order: z.array(z.object({ id: z.string(), sortOrder: z.number().int().min(0) })),
    });
    app.get("/drink-sizes", async (req, reply) => {
        const result = await getDrinkSizesOptionGroup(app.prisma);
        if (!result.ok) {
            reply.code(404);
            return { error: result.error, message: "Missing required option group: Sizes", code: "SIZES_GROUP_MISSING" };
        }
        return {
            optionGroupId: result.optionGroupId,
            optionGroupName: result.optionGroupName,
            options: result.options,
        };
    });
    // Menu Settings > Sizes (separate from Option Groups)
    const SIZES_GROUP_KEY = "SIZES";
    app.get("/menu-settings/sizes", async (req, reply) => {
        const group = await app.prisma.menuSettingGroup.findUnique({
            where: { key: SIZES_GROUP_KEY },
            include: {
                menuSizes: { orderBy: { sortOrder: "asc" } },
            },
        });
        if (!group) {
            reply.code(404);
            return { error: "SIZES_GROUP_NOT_FOUND", message: "Sizes group not found. Run db:seed." };
        }
        const activeSizes = group.menuSizes.filter((s) => s.isActive);
        // Use MenuSizeAvailability as the source of truth for which sizes apply to each mode
        const rows = await app.prisma.menuSizeAvailability.findMany({
            where: {
                isEnabled: true,
                size: { groupId: group.id },
            },
            orderBy: { sortOrder: "asc" },
            include: { size: true },
        });
        const availability = {
            ICED: [],
            HOT: [],
            CONCENTRATED: [],
        };
        const variants = [];
        for (const row of rows) {
            if (!row.size.isActive)
                continue;
            if (!availability[row.mode]) {
                availability[row.mode] = [];
            }
            availability[row.mode].push(row.sizeId);
            variants.push({
                id: row.id,
                mode: row.mode,
                sizeId: row.sizeId,
                sizeLabel: row.size.label,
                imageUrl: row.imageUrl,
                sortOrder: row.sortOrder,
            });
        }
        // Fallback: if no availability rows exist yet, treat all active sizes as available in every mode
        const hasAnyAvailability = Object.values(availability).some((list) => list.length > 0);
        if (!hasAnyAvailability) {
            const allSizeIds = activeSizes.map((s) => s.id);
            availability.ICED = [...allSizeIds];
            availability.HOT = [...allSizeIds];
            availability.CONCENTRATED = [...allSizeIds];
        }
        return {
            sizes: group.menuSizes.map((s) => ({
                id: s.id,
                label: s.label,
                sortOrder: s.sortOrder,
                isActive: s.isActive,
            })),
            availability,
            variants,
        };
    });
    app.post("/menu-settings/sizes", async (req, reply) => {
        const parsed = z.object({
            label: z.string().min(1),
            sortOrder: z.number().int().optional(),
        }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const group = await app.prisma.menuSettingGroup.findUnique({
            where: { key: SIZES_GROUP_KEY },
        });
        if (!group) {
            reply.code(404);
            return { error: "SIZES_GROUP_NOT_FOUND", message: "Sizes group not found. Run db:seed." };
        }
        await bumpCatalogVersion(app.prisma);
        return app.prisma.menuSize.create({
            data: {
                groupId: group.id,
                label: parsed.data.label,
                sortOrder: parsed.data.sortOrder ?? 0,
            },
        });
    });
    app.patch("/menu-settings/sizes/:id", async (req, reply) => {
        const { id } = req.params;
        const parsed = z.object({
            label: z.string().min(1).optional(),
            sortOrder: z.number().int().optional(),
            isActive: z.boolean().optional(),
        }).partial().safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const group = await app.prisma.menuSettingGroup.findUnique({
            where: { key: SIZES_GROUP_KEY },
            include: { menuSizes: true },
        });
        if (!group) {
            reply.code(404);
            return { error: "SIZES_GROUP_NOT_FOUND" };
        }
        const size = group.menuSizes.find((s) => s.id === id);
        if (!size) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Size not found" };
        }
        await bumpCatalogVersion(app.prisma);
        return app.prisma.menuSize.update({
            where: { id },
            data: parsed.data,
        });
    });
    // POST /admin/menu-settings/sizes/availability/:id/image - multipart upload for variant image
    app.post("/menu-settings/sizes/availability/:id/image", async (req, reply) => {
        const { id } = req.params;
        const row = await app.prisma.menuSizeAvailability.findUnique({
            where: { id },
            include: { size: { include: { group: true } } },
        });
        if (!row || row.size.group.key !== SIZES_GROUP_KEY) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Variant not found" };
        }
        const data = await req.file();
        if (!data) {
            reply.code(400);
            return { error: "NO_FILE" };
        }
        const ext = extFromMime(data.mimetype);
        const filename = `${randomBytes(12).toString("hex")}.${ext}`;
        const buf = await buffer(data.file);
        const imageUrl = await uploadImage(buf, filename, data.mimetype);
        await bumpCatalogVersion(app.prisma);
        const updated = await app.prisma.menuSizeAvailability.update({
            where: { id },
            data: { imageUrl },
        });
        return { imageUrl: updated.imageUrl };
    });
    app.delete("/menu-settings/sizes/:id", async (req, reply) => {
        const { id } = req.params;
        const group = await app.prisma.menuSettingGroup.findUnique({
            where: { key: SIZES_GROUP_KEY },
            include: { menuSizes: true },
        });
        if (!group) {
            reply.code(404);
            return { error: "SIZES_GROUP_NOT_FOUND" };
        }
        const size = group.menuSizes.find((s) => s.id === id);
        if (!size) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Size not found" };
        }
        await bumpCatalogVersion(app.prisma);
        await app.prisma.menuSize.update({
            where: { id },
            data: { isActive: false },
        });
        reply.code(204);
    });
    const menuSizeAvailabilitySchema = z.object({
        availability: z.object({
            ICED: z.array(z.string()),
            HOT: z.array(z.string()),
            CONCENTRATED: z.array(z.string()),
        }),
    });
    app.put("/menu-settings/sizes/availability", async (req, reply) => {
        const parsed = menuSizeAvailabilitySchema.safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const group = await app.prisma.menuSettingGroup.findUnique({
            where: { key: SIZES_GROUP_KEY },
            include: { menuSizes: true },
        });
        if (!group) {
            reply.code(404);
            return { error: "SIZES_GROUP_NOT_FOUND", message: "Sizes group not found. Run db:seed." };
        }
        const validSizeIds = new Set(group.menuSizes.map((s) => s.id));
        const { availability } = parsed.data;
        for (const mode of ["ICED", "HOT", "CONCENTRATED"]) {
            for (const sizeId of availability[mode]) {
                if (!validSizeIds.has(sizeId)) {
                    reply.code(400);
                    return { error: "INVALID_SIZE_ID", message: `Size id ${sizeId} is not part of the Sizes group.` };
                }
            }
        }
        await bumpCatalogVersion(app.prisma);
        const allSizeIds = Array.from(validSizeIds);
        const existingRows = await app.prisma.menuSizeAvailability.findMany({
            where: { sizeId: { in: allSizeIds } },
            select: { mode: true, sizeId: true, imageUrl: true },
        });
        const imageByKey = new Map(existingRows.map((r) => [`${r.mode}:${r.sizeId}`, r.imageUrl]));
        await app.prisma.$transaction(async (tx) => {
            await tx.menuSizeAvailability.deleteMany({
                where: {
                    sizeId: { in: allSizeIds },
                },
            });
            const modes = ["ICED", "HOT", "CONCENTRATED"];
            for (const mode of modes) {
                const sizeIdsForMode = availability[mode];
                if (sizeIdsForMode.length === 0)
                    continue;
                await tx.menuSizeAvailability.createMany({
                    data: sizeIdsForMode.map((sizeId, index) => ({
                        mode,
                        sizeId,
                        isEnabled: true,
                        sortOrder: index,
                        imageUrl: imageByKey.get(`${mode}:${sizeId}`) ?? null,
                    })),
                });
            }
        });
        return { ok: true };
    });
    // Menu Settings > Shots (extra-shot pricing)
    app.get("/menu-settings/shots", async () => {
        const rules = await app.prisma.shotPricingRule.findMany({
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        });
        const active = rules.find((r) => r.isActive) ?? rules[0] ?? null;
        return { rules, activeRule: active };
    });
    app.post("/menu-settings/shots", async (req, reply) => {
        const parsed = z
            .object({
            name: z.string().optional(),
            shotsPerBundle: z.number().int().min(1),
            priceCentsPerBundle: z.number().int().min(0),
            isActive: z.boolean().optional().default(true),
        })
            .safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const count = await app.prisma.shotPricingRule.count();
        return app.prisma.shotPricingRule.create({
            data: {
                name: parsed.data.name ?? "Standard",
                shotsPerBundle: parsed.data.shotsPerBundle,
                priceCentsPerBundle: parsed.data.priceCentsPerBundle,
                isActive: parsed.data.isActive ?? true,
                sortOrder: count,
            },
        });
    });
    app.patch("/menu-settings/shots/:id", async (req, reply) => {
        const { id } = req.params;
        const parsed = z
            .object({
            name: z.string().optional(),
            shotsPerBundle: z.number().int().min(1).optional(),
            priceCentsPerBundle: z.number().int().min(0).optional(),
            isActive: z.boolean().optional(),
        })
            .partial()
            .safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const existing = await app.prisma.shotPricingRule.findUnique({ where: { id } });
        if (!existing) {
            reply.code(404);
            return { error: "NOT_FOUND" };
        }
        return app.prisma.shotPricingRule.update({ where: { id }, data: parsed.data });
    });
    // Menu Settings > Transaction Types (requires Prisma client with TransactionTypeSetting model)
    const txDelegate = () => {
        const d = app.prisma.transactionTypeSetting;
        return d;
    };
    const handleTxError = (err, reply) => {
        const code = err?.code;
        if (code === "P2021" || code === "P2022") {
            reply.code(503);
            return { error: "SCHEMA_OUT_OF_SYNC", message: "Transaction types table is missing. Run migrations for apps/cloud-api." };
        }
        throw err;
    };
    app.get("/menu-settings/transaction-types", async (req, reply) => {
        const tx = txDelegate();
        if (!tx) {
            reply.code(503);
            return { error: "PRISMA_CLIENT_OUTDATED", message: "Run 'pnpm exec prisma generate' in apps/cloud-api and restart the API." };
        }
        try {
            return await tx.findMany({
                orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            });
        }
        catch (e) {
            return handleTxError(e, reply);
        }
    });
    function labelToCode(label) {
        return label
            .trim()
            .toUpperCase()
            .replace(/\s+/g, "_")
            .replace(/[^A-Z0-9_]/g, "")
            || "TX_TYPE";
    }
    app.post("/menu-settings/transaction-types", async (req, reply) => {
        const parsed = z
            .object({
            label: z.string().min(1),
            priceDeltaCents: z.number().int().min(0).optional(),
            isActive: z.boolean().optional().default(true),
        })
            .safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const tx = txDelegate();
        if (!tx) {
            reply.code(503);
            return { error: "PRISMA_CLIENT_OUTDATED", message: "Run 'pnpm exec prisma generate' in apps/cloud-api and restart the API." };
        }
        try {
            let code = labelToCode(parsed.data.label);
            let suffix = 0;
            while (true) {
                const candidate = suffix === 0 ? code : `${code}_${suffix}`;
                const existing = await tx.findUnique({
                    where: { code: candidate },
                });
                if (!existing) {
                    code = candidate;
                    break;
                }
                suffix += 1;
                if (suffix > 100) {
                    reply.code(400);
                    return { error: "CODE_COLLISION", message: "Could not generate unique code from label" };
                }
            }
            const count = await tx.count();
            return await tx.create({
                data: {
                    code,
                    label: parsed.data.label.trim(),
                    priceDeltaCents: parsed.data.priceDeltaCents ?? 0,
                    isActive: parsed.data.isActive ?? true,
                    sortOrder: count,
                },
            });
        }
        catch (e) {
            return handleTxError(e, reply);
        }
    });
    app.patch("/menu-settings/transaction-types/:id", async (req, reply) => {
        const tx = txDelegate();
        if (!tx) {
            reply.code(503);
            return { error: "PRISMA_CLIENT_OUTDATED", message: "Run 'pnpm exec prisma generate' in apps/cloud-api and restart the API." };
        }
        const { id } = req.params;
        const parsed = z
            .object({
            label: z.string().min(1).optional(),
            priceDeltaCents: z.number().int().min(0).optional(),
            isActive: z.boolean().optional(),
            sortOrder: z.number().int().optional(),
        })
            .partial()
            .safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        try {
            const existing = await tx.findUnique({ where: { id } });
            if (!existing) {
                reply.code(404);
                return { error: "NOT_FOUND" };
            }
            return await tx.update({ where: { id }, data: parsed.data });
        }
        catch (e) {
            return handleTxError(e, reply);
        }
    });
    // One-time cleanup: remove legacy "Sizes" OptionGroup and its options (safe no-op if absent)
    app.post("/cleanup-legacy-sizes", async (req, reply) => {
        const group = await app.prisma.menuOptionGroup.findFirst({
            where: { name: "Sizes" },
            include: { options: true },
        });
        if (!group) {
            return { ok: true, message: "Legacy Sizes option group not found; nothing to clean up." };
        }
        await bumpCatalogVersion(app.prisma);
        await app.prisma.menuOptionGroup.delete({ where: { id: group.id } });
        return { ok: true, message: `Removed legacy Sizes option group and ${group.options.length} option(s).` };
    });
    app.get("/items", async (req) => {
        const includeDeleted = req.query?.includeDeleted === "1";
        return app.prisma.menuItem.findMany({
            where: includeDeleted ? {} : { deletedAt: null },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            include: {
                recipeLines: true,
                category: true,
                subCategory: true,
                defaultSize: true,
                defaultSizeOption: true,
                sizes: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { label: "asc" }] },
                optionGroupLinks: { include: { group: { include: { options: true, defaultOption: true } } } },
                drinkSizeConfigs: { include: { option: true } },
                drinkModeDefaults: { include: { option: true } },
            },
        });
    });
    app.post("/items/reorder", async (req, reply) => {
        const parsed = reorderOrderSchema.safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten(), message: "order array of { id, sortOrder } required" };
        }
        const ids = parsed.data.order.map((o) => o.id);
        const existing = await app.prisma.menuItem.findMany({ where: { id: { in: ids } }, select: { id: true, subCategoryId: true } });
        const foundIds = new Set(existing.map((i) => i.id));
        const missing = ids.filter((id) => !foundIds.has(id));
        if (missing.length > 0) {
            reply.code(400);
            return { error: "INVALID_IDS", message: `Item ids not found: ${missing.join(", ")}` };
        }
        const subIds = [...new Set(existing.map((i) => i.subCategoryId))];
        if (subIds.length > 1) {
            reply.code(400);
            return { error: "MIXED_SCOPE", message: "All items must belong to the same subcategory" };
        }
        const version = await bumpCatalogVersion(app.prisma);
        await app.prisma.$transaction([
            ...parsed.data.order.map(({ id, sortOrder }) => app.prisma.menuItem.update({ where: { id }, data: { sortOrder, version } })),
        ]);
        const list = await app.prisma.menuItem.findMany({
            where: { id: { in: ids } },
            orderBy: { sortOrder: "asc" },
            include: { category: true, subCategory: true },
        });
        return list;
    });
    app.post("/items", async (req, reply) => {
        const parsed = menuItemCreateSchema.safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten(), message: "subCategoryId is required" };
        }
        const sub = await app.prisma.subCategory.findUnique({
            where: { id: parsed.data.subCategoryId },
            select: { categoryId: true },
        });
        if (!sub) {
            reply.code(400);
            return { error: "SUBCATEGORY_NOT_FOUND", message: "SubCategory not found" };
        }
        let defaultSizeOptionId = parsed.data.defaultSizeOptionId ?? null;
        if (defaultSizeOptionId) {
            const drinkSizes = await getDrinkSizesOptionGroup(app.prisma);
            if (!drinkSizes.ok || !drinkSizes.options.some((o) => o.id === defaultSizeOptionId)) {
                reply.code(400);
                return { error: "INVALID_DEFAULT_SIZE", message: `Default size must be from "${drinkSizes.ok ? drinkSizes.optionGroupName : "Sizes"}" option group` };
            }
        }
        const version = await bumpCatalogVersion(app.prisma);
        // Place new item at the end of its subcategory unless sortOrder is explicitly provided
        let sortOrder = parsed.data.sortOrder;
        if (sortOrder === undefined) {
            const maxOrder = await app.prisma.menuItem.aggregate({
                _max: { sortOrder: true },
                where: { subCategoryId: parsed.data.subCategoryId },
            });
            sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;
        }
        const shotData = parsed.data.supportsShots
            ? { supportsShots: true, defaultShots: parsed.data.defaultShots ?? 1 }
            : { supportsShots: false, defaultShots: null };
        return app.prisma.menuItem.create({
            data: {
                name: parsed.data.name,
                priceCents: parsed.data.priceCents,
                isActive: parsed.data.isActive ?? true,
                hasSizes: parsed.data.hasSizes ?? false,
                imageUrl: parsed.data.imageUrl ?? null,
                subCategoryId: parsed.data.subCategoryId,
                categoryId: sub.categoryId,
                defaultSizeOptionId,
                sortOrder,
                version,
                ...shotData,
            },
        });
    });
    app.get("/items/:id", async (req, reply) => {
        const { id } = req.params;
        const includeDeleted = req.query?.includeDeleted === "1";
        const item = await app.prisma.menuItem.findUnique({
            where: { id },
            include: {
                recipeLines: true,
                category: true,
                subCategory: true,
                defaultSize: true,
                defaultSizeOption: true,
                defaultSubstitute: true,
                defaultSubstituteOption: true,
                addOnLinks: { include: { addOn: true } },
                substituteLinks: { include: { substitute: true } },
                addOnGroupLinks: { include: { group: { include: { options: { include: { recipeLines: { include: { ingredient: true } } } } } } } },
                substituteGroupLinks: { include: { group: { include: { options: { include: { recipeLines: { include: { ingredient: true } } } } } } } },
                sizes: { orderBy: [{ sortOrder: "asc" }, { label: "asc" }] },
                optionGroupLinks: { include: { group: { include: { options: true, defaultOption: true } } } },
                drinkSizeConfigs: { include: { option: true } },
                drinkModeDefaults: { include: { option: true } },
                sizePrices: true,
            },
        });
        if (!item) {
            reply.code(404);
            return { error: "NOT_FOUND" };
        }
        if (item.deletedAt && !includeDeleted) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Item has been deleted" };
        }
        return item;
    });
    // POST /admin/items/:id/image - multipart upload
    app.post("/items/:id/image", async (req, reply) => {
        const { id } = req.params;
        const item = await app.prisma.menuItem.findUnique({ where: { id }, select: { id: true, deletedAt: true } });
        if (!item) {
            reply.code(404);
            return { error: "NOT_FOUND" };
        }
        if (item.deletedAt) {
            reply.code(400);
            return { error: "ITEM_DELETED", message: "Cannot edit a deleted item. Restore it first." };
        }
        const data = await req.file();
        if (!data) {
            reply.code(400);
            return { error: "NO_FILE" };
        }
        const ext = extFromMime(data.mimetype);
        const filename = `${randomBytes(12).toString("hex")}.${ext}`;
        const buf = await buffer(data.file);
        const imageUrl = await uploadImage(buf, filename, data.mimetype);
        const version = await bumpCatalogVersion(app.prisma);
        await app.prisma.menuItem.update({ where: { id }, data: { imageUrl, version } });
        return { imageUrl };
    });
    app.patch("/items/:id", async (req, reply) => {
        const { id } = req.params;
        const parsed = menuItemUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const existing = await app.prisma.menuItem.findUnique({ where: { id }, select: { defaultSizeOptionId: true, subCategoryId: true, deletedAt: true } });
        if (!existing) {
            reply.code(404);
            return { error: "NOT_FOUND" };
        }
        if (existing.deletedAt) {
            reply.code(400);
            return { error: "ITEM_DELETED", message: "Cannot edit a deleted item. Restore it first." };
        }
        const version = await bumpCatalogVersion(app.prisma);
        let defaultSizeOptionId = parsed.data.defaultSizeOptionId !== undefined ? parsed.data.defaultSizeOptionId : existing.defaultSizeOptionId;
        if (defaultSizeOptionId) {
            const drinkSizes = await getDrinkSizesOptionGroup(app.prisma);
            if (!drinkSizes.ok || !drinkSizes.options.some((o) => o.id === defaultSizeOptionId)) {
                reply.code(400);
                return { error: "INVALID_DEFAULT_SIZE", message: `Default size must be from "${drinkSizes.ok ? drinkSizes.optionGroupName : "Sizes"}" option group` };
            }
        }
        let defaultSubstituteId = parsed.data.defaultSubstituteId !== undefined ? parsed.data.defaultSubstituteId : undefined;
        let defaultSubstituteOptionId = parsed.data.defaultSubstituteOptionId !== undefined ? parsed.data.defaultSubstituteOptionId : undefined;
        if (defaultSubstituteId !== undefined) {
            if (defaultSubstituteId) {
                const sub = await app.prisma.substitute.findUnique({ where: { id: defaultSubstituteId }, select: { id: true, isActive: true } });
                if (!sub) {
                    reply.code(400);
                    return { error: "SUBSTITUTE_NOT_FOUND", message: "Default milk substitute not found" };
                }
                if (!sub.isActive) {
                    reply.code(400);
                    return { error: "SUBSTITUTE_INACTIVE", message: "Default milk substitute must be active" };
                }
            }
        }
        if (defaultSubstituteOptionId !== undefined) {
            if (defaultSubstituteOptionId) {
                const opt = await app.prisma.substituteOption.findUnique({ where: { id: defaultSubstituteOptionId }, select: { id: true, isActive: true } });
                if (!opt) {
                    reply.code(400);
                    return { error: "SUBSTITUTE_OPTION_NOT_FOUND", message: "Default milk substitute option not found" };
                }
                if (!opt.isActive) {
                    reply.code(400);
                    return { error: "SUBSTITUTE_OPTION_INACTIVE", message: "Default milk option must be active" };
                }
            }
        }
        const updateData = {
            ...parsed.data,
            defaultSizeOptionId: defaultSizeOptionId ?? null,
            version,
        };
        if (defaultSubstituteId !== undefined) {
            updateData.defaultSubstituteId = defaultSubstituteId ?? null;
        }
        if (defaultSubstituteOptionId !== undefined) {
            updateData.defaultSubstituteOptionId = defaultSubstituteOptionId ?? null;
        }
        if (parsed.data.supportsShots === true) {
            updateData.supportsShots = true;
            updateData.defaultShots = parsed.data.defaultShots ?? 1;
        }
        else if (parsed.data.supportsShots === false) {
            updateData.supportsShots = false;
            updateData.defaultShots = null;
        }
        if (parsed.data.subCategoryId) {
            const sub = await app.prisma.subCategory.findUnique({ where: { id: parsed.data.subCategoryId }, select: { categoryId: true } });
            if (!sub) {
                reply.code(400);
                return { error: "SUBCATEGORY_NOT_FOUND", message: "SubCategory not found" };
            }
            updateData.categoryId = sub.categoryId;
        }
        return app.prisma.menuItem.update({ where: { id }, data: updateData });
    });
    const drinkSizesByModeSchema = z.object({
        drinkSizesByMode: z.object({
            ICED: z.object({ enabledOptionIds: z.array(z.string()), defaultOptionId: z.string().nullable() }),
            HOT: z.object({ enabledOptionIds: z.array(z.string()), defaultOptionId: z.string().nullable() }),
            CONCENTRATED: z.object({ enabledOptionIds: z.array(z.string()), defaultOptionId: z.string().nullable() }),
        }),
        hasSizes: z.boolean().optional(),
        sizePricesByMode: z
            .object({
            ICED: z.record(z.string(), z.number().int().min(0)).optional(),
            HOT: z.record(z.string(), z.number().int().min(0)).optional(),
            CONCENTRATED: z.record(z.string(), z.number().int().min(0)).optional(),
        })
            .optional(),
    });
    app.put("/items/:id/drink-sizes", async (req, reply) => {
        const { id } = req.params;
        const parsed = drinkSizesByModeSchema.safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten(), message: "drinkSizesByMode with ICED, HOT, CONCENTRATED is required" };
        }
        const item = await app.prisma.menuItem.findUnique({ where: { id }, select: { id: true, deletedAt: true } });
        if (!item) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Item not found" };
        }
        if (item.deletedAt) {
            reply.code(400);
            return { error: "ITEM_DELETED", message: "Cannot edit a deleted item. Restore it first." };
        }
        const validIds = await getDrinkSizesOptionIds(app.prisma);
        if (!validIds.ok) {
            reply.code(400);
            return { error: "DRINK_SIZES_GROUP_MISSING", message: validIds.error };
        }
        const { drinkSizesByMode, hasSizes: hasSizesInput, sizePricesByMode } = parsed.data;
        const modes = ["ICED", "HOT", "CONCENTRATED"];
        let anyEnabled = false;
        for (const mode of modes) {
            const { enabledOptionIds, defaultOptionId } = drinkSizesByMode[mode];
            for (const optId of enabledOptionIds) {
                if (!validIds.optionIds.has(optId)) {
                    reply.code(400);
                    return { error: "INVALID_OPTION", message: `Option ${optId} is not in Sizes group. All size options must come from that group.` };
                }
            }
            if (enabledOptionIds.length === 0 && defaultOptionId !== null) {
                reply.code(400);
                return { error: "INVALID_DEFAULT", message: `For mode ${mode}: when no sizes are enabled, default must be null.` };
            }
            if (enabledOptionIds.length > 0 && defaultOptionId !== null && !enabledOptionIds.includes(defaultOptionId)) {
                reply.code(400);
                return { error: "INVALID_DEFAULT", message: `For mode ${mode}: default size must be one of the enabled sizes.` };
            }
            if (enabledOptionIds.length > 0)
                anyEnabled = true;
        }
        const hasSizes = hasSizesInput ?? anyEnabled;
        // When hasSizes = true, require a price for every enabled size
        if (hasSizes) {
            for (const mode of modes) {
                const { enabledOptionIds } = drinkSizesByMode[mode];
                for (const optId of enabledOptionIds) {
                    const modePrices = sizePricesByMode?.[mode];
                    const price = modePrices ? modePrices[optId] : undefined;
                    if (price === undefined) {
                        reply.code(400);
                        return {
                            error: "MISSING_SIZE_PRICE",
                            message: `Price is required for size option ${optId} in mode ${mode}.`,
                        };
                    }
                }
            }
        }
        const version = await bumpCatalogVersion(app.prisma);
        await app.prisma.$transaction([
            app.prisma.menuItemDrinkSizeConfig.deleteMany({ where: { menuItemId: id } }),
            app.prisma.menuItemDrinkModeDefault.deleteMany({ where: { menuItemId: id } }),
            app.prisma.menuItemSizePrice.deleteMany({ where: { menuItemId: id } }),
            app.prisma.menuItem.update({ where: { id }, data: { version, hasSizes } }),
        ]);
        for (const mode of modes) {
            const { enabledOptionIds, defaultOptionId } = drinkSizesByMode[mode];
            if (enabledOptionIds.length > 0) {
                await app.prisma.menuItemDrinkSizeConfig.createMany({
                    data: enabledOptionIds.map((optionId) => ({
                        menuItemId: id,
                        mode,
                        optionId,
                        isEnabled: true,
                    })),
                });
                if (defaultOptionId) {
                    await app.prisma.menuItemDrinkModeDefault.create({
                        data: { menuItemId: id, mode, defaultOptionId },
                    });
                }
                // Create price rows for enabled sizes when hasSizes is true
                if (hasSizes) {
                    const modePrices = sizePricesByMode?.[mode] ?? {};
                    const optionIdsNeedingPrice = enabledOptionIds.filter((optId) => modePrices[optId] !== undefined);
                    if (optionIdsNeedingPrice.length > 0) {
                        const options = await app.prisma.menuOption.findMany({
                            where: { id: { in: optionIdsNeedingPrice } },
                            select: { id: true, name: true },
                        });
                        const nameById = new Map(options.map((o) => [o.id, o.name]));
                        await app.prisma.menuItemSizePrice.createMany({
                            data: optionIdsNeedingPrice.map((optId) => ({
                                menuItemId: id,
                                baseType: mode,
                                sizeOptionId: optId,
                                sizeCode: nameById.get(optId) ?? optId,
                                priceCents: modePrices[optId] ?? 0,
                            })),
                        });
                    }
                }
            }
        }
        const updated = await app.prisma.menuItem.findUnique({
            where: { id },
            include: {
                drinkSizeConfigs: { include: { option: true } },
                drinkModeDefaults: { include: { option: true } },
            },
        });
        return updated;
    });
    app.delete("/items/:id", async (req, reply) => {
        const { id } = req.params;
        const item = await app.prisma.menuItem.findUnique({ where: { id }, select: { id: true, deletedAt: true } });
        if (!item) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Item not found" };
        }
        if (item.deletedAt) {
            reply.code(400);
            return { error: "ALREADY_DELETED", message: "Item is already deleted" };
        }
        const version = await bumpCatalogVersion(app.prisma);
        await app.prisma.menuItem.update({
            where: { id },
            data: { deletedAt: new Date(), version },
        });
        return { ok: true };
    });
    app.post("/items/:id/restore", async (req, reply) => {
        const { id } = req.params;
        const item = await app.prisma.menuItem.findUnique({ where: { id }, select: { id: true, deletedAt: true } });
        if (!item) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Item not found" };
        }
        if (!item.deletedAt) {
            reply.code(400);
            return { error: "NOT_DELETED", message: "Item is not deleted" };
        }
        const version = await bumpCatalogVersion(app.prisma);
        return app.prisma.menuItem.update({
            where: { id },
            data: { deletedAt: null, version },
            include: {
                recipeLines: true,
                category: true,
                subCategory: true,
                defaultSize: true,
                sizes: { orderBy: [{ sortOrder: "asc" }, { label: "asc" }] },
                optionGroupLinks: { include: { group: { include: { options: true, defaultOption: true } } } },
            },
        });
    });
    // Ingredient Categories
    app.get("/ingredient-categories", async () => {
        return app.prisma.ingredientCategory.findMany({
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        });
    });
    app.post("/ingredient-categories", async (req, reply) => {
        const parsed = z.object({ name: z.string().min(1), sortOrder: z.number().int().min(0).optional() }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        return app.prisma.ingredientCategory.create({
            data: { name: parsed.data.name.trim(), sortOrder: parsed.data.sortOrder ?? 0 },
        });
    });
    app.delete("/ingredient-categories/:id", async (req, reply) => {
        const { id } = req.params;
        const count = await app.prisma.ingredient.count({ where: { categoryId: id, deletedAt: null } });
        if (count > 0) {
            reply.code(400);
            return { error: "CATEGORY_IN_USE", message: "Cannot delete category with ingredients. Reassign ingredients first." };
        }
        await app.prisma.ingredientCategory.delete({ where: { id } });
        reply.code(204);
    });
    // Ingredient CRUD
    const ingredientCreateSchema = z.object({
        name: z.string().min(1),
        unitCode: z.string().min(1),
        isActive: z.boolean().optional().default(true),
        categoryId: z.string().optional().nullable(),
        sortOrder: z.number().int().min(0).optional(),
        department: z.enum(["BAR", "KITCHEN", "PASTRY", "SHARED"]).optional().nullable(),
        trackingType: z.enum(["VOLATILE", "EXACT", "COUNT_ONLY"]).optional().nullable(),
        quickCountUnitName: z.string().optional().nullable(),
        quickCountUnitToBase: z.number().optional().nullable(),
        warehouseUnitName: z.string().optional().nullable(),
        warehouseUnitToBase: z.number().optional().nullable(),
    });
    const ingredientUpdateSchema = ingredientCreateSchema.partial();
    app.get("/ingredients", async () => {
        return app.prisma.ingredient.findMany({
            where: { deletedAt: null },
            include: { category: { select: { id: true, name: true } } },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        });
    });
    app.post("/ingredients", async (req, reply) => {
        const parsed = ingredientCreateSchema.safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const version = await bumpCatalogVersion(app.prisma);
        return app.prisma.ingredient.create({
            data: { ...parsed.data, version },
        });
    });
    app.get("/ingredients/:id", async (req, reply) => {
        const { id } = req.params;
        const ing = await app.prisma.ingredient.findUnique({ where: { id } });
        if (!ing) {
            reply.code(404);
            return { error: "NOT_FOUND" };
        }
        return ing;
    });
    app.patch("/ingredients/:id", async (req, reply) => {
        const { id } = req.params;
        const parsed = ingredientUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const version = await bumpCatalogVersion(app.prisma);
        return app.prisma.ingredient.update({
            where: { id },
            data: { ...parsed.data, version },
        });
    });
    app.delete("/ingredients/:id", async (req, reply) => {
        const { id } = req.params;
        const version = await bumpCatalogVersion(app.prisma);
        await app.prisma.ingredient.update({
            where: { id },
            data: { deletedAt: new Date(), version },
        });
        reply.code(204);
    });
    app.post("/ingredients/reorder", async (req, reply) => {
        const parsed = z.object({ order: z.array(z.object({ id: z.string(), sortOrder: z.number().int().min(0) })) }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        await app.prisma.$transaction(parsed.data.order.map(({ id, sortOrder }) => app.prisma.ingredient.update({ where: { id }, data: { sortOrder } })));
        return { ok: true };
    });
    // POST /admin/ingredients/:id/image - multipart upload
    app.post("/ingredients/:id/image", async (req, reply) => {
        const { id } = req.params;
        const ing = await app.prisma.ingredient.findUnique({ where: { id }, select: { id: true, deletedAt: true } });
        if (!ing) {
            reply.code(404);
            return { error: "NOT_FOUND" };
        }
        if (ing.deletedAt) {
            reply.code(400);
            return { error: "INGREDIENT_DELETED", message: "Cannot edit a deleted ingredient. Restore it first." };
        }
        const data = await req.file();
        if (!data) {
            reply.code(400);
            return { error: "NO_FILE" };
        }
        const ext = extFromMime(data.mimetype);
        const filename = `${randomBytes(12).toString("hex")}.${ext}`;
        const buf = await buffer(data.file);
        const imageUrl = await uploadImage(buf, filename, data.mimetype);
        const version = await bumpCatalogVersion(app.prisma);
        await app.prisma.ingredient.update({ where: { id }, data: { imageUrl, version } });
        return { imageUrl };
    });
    // GET /admin/inventory/locations
    app.get("/inventory/locations", async () => {
        return app.prisma.inventoryLocation.findMany({
            where: { isActive: true },
            orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
        });
    });
    // POST /admin/inventory/locations
    app.post("/inventory/locations", async (req, reply) => {
        const parsed = z.object({
            code: z.string().min(1),
            name: z.string().min(1),
            locationType: z.enum(["WAREHOUSE", "STORE", "EVENT", "POPUP"]),
            sortOrder: z.number().int().optional(),
        }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        return app.prisma.inventoryLocation.create({
            data: {
                code: parsed.data.code.toUpperCase().replace(/\s+/g, "_"),
                name: parsed.data.name,
                locationType: parsed.data.locationType,
                sortOrder: parsed.data.sortOrder ?? 0,
            },
        });
    });
    // GET /admin/inventory/stock - computed stock from StockMovement ledger (location-aware)
    app.get("/inventory/stock", async () => {
        const byKey = await app.inventoryService.getStockByIngredientLocation();
        const locations = await app.prisma.inventoryLocation.findMany({
            where: { isActive: true },
            orderBy: [{ sortOrder: "asc" }],
            select: { id: true, code: true, name: true },
        });
        const ingredients = await app.prisma.ingredient.findMany({
            where: { deletedAt: null },
            select: {
                id: true,
                name: true,
                imageUrl: true,
                unitCode: true,
                sortOrder: true,
                department: true,
                trackingType: true,
                category: { select: { name: true } },
            },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        });
        const lastByIngredient = await app.prisma.stockMovement.groupBy({
            by: ["ingredientId"],
            _max: { createdAt: true },
        });
        const lastMap = new Map(lastByIngredient.map((r) => [r.ingredientId, r._max.createdAt]));
        return ingredients.map((ing) => {
            const stocksByLocation = {};
            for (const loc of locations) {
                stocksByLocation[loc.code] = byKey.get(`${ing.id}:${loc.id}`) ?? 0;
            }
            const mainCafe = locations.find((l) => l.code === "MAIN_CAFE");
            const warehouse = locations.find((l) => l.code === "WAREHOUSE");
            return {
                ingredientId: ing.id,
                ingredientName: ing.name,
                imageUrl: ing.imageUrl ?? null,
                categoryName: ing.category?.name ?? null,
                unitCode: ing.unitCode,
                department: ing.department,
                trackingType: ing.trackingType,
                storeStock: mainCafe ? (byKey.get(`${ing.id}:${mainCafe.id}`) ?? 0) : 0,
                warehouseStock: warehouse ? (byKey.get(`${ing.id}:${warehouse.id}`) ?? 0) : 0,
                stocksByLocation,
                lastMovementAt: lastMap.get(ing.id) ?? null,
            };
        });
    });
    // POST /admin/inventory/transfers - create or approve transfer
    const createTransferSchema = z.object({
        fromLocationId: z.string(),
        toLocationId: z.string(),
        lines: z.array(z.object({
            ingredientId: z.string(),
            quantityInput: z.number(),
            quantityBase: z.number(),
        })),
        notes: z.string().optional(),
    });
    app.post("/inventory/transfers", async (req, reply) => {
        const parsed = createTransferSchema.safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const transfer = await app.prisma.stockTransfer.create({
            data: {
                fromLocationId: parsed.data.fromLocationId,
                toLocationId: parsed.data.toLocationId,
                status: "DRAFT",
                notes: parsed.data.notes ?? null,
                lines: {
                    create: parsed.data.lines.map((l) => ({
                        ingredientId: l.ingredientId,
                        quantityInput: l.quantityInput,
                        quantityBase: l.quantityBase,
                    })),
                },
            },
            include: { lines: true },
        });
        return transfer;
    });
    app.patch("/inventory/transfers/:id/approve", async (req, reply) => {
        const { id } = req.params;
        const transfer = await app.prisma.stockTransfer.findUnique({
            where: { id },
            include: { lines: true },
        });
        if (!transfer) {
            reply.code(404);
            return { error: "NOT_FOUND" };
        }
        if (transfer.status !== "DRAFT" && transfer.status !== "SUBMITTED") {
            reply.code(400);
            return { error: "INVALID_STATUS", message: "Transfer must be DRAFT or SUBMITTED to approve" };
        }
        await app.inventoryService.postTransfer({
            fromLocationId: transfer.fromLocationId,
            toLocationId: transfer.toLocationId,
            sourceId: id,
            lines: transfer.lines.map((l) => ({ ingredientId: l.ingredientId, quantityBase: Number(l.quantityBase) })),
        });
        await app.prisma.stockTransfer.update({
            where: { id },
            data: { status: "APPROVED" },
        });
        return { ok: true };
    });
    // POST /admin/inventory/reconciliations
    const createReconciliationSchema = z.object({
        locationId: z.string(),
        businessDate: z.string(),
        lines: z.array(z.object({
            ingredientId: z.string(),
            theoreticalQtyBase: z.number(),
            actualQtyBase: z.number(),
            varianceQtyBase: z.number(),
            varianceReasonCode: z.string().optional(),
        })),
        notes: z.string().optional(),
    });
    app.post("/inventory/reconciliations", async (req, reply) => {
        const parsed = createReconciliationSchema.safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const businessDate = new Date(parsed.data.businessDate);
        const reconciliation = await app.prisma.inventoryReconciliation.create({
            data: {
                locationId: parsed.data.locationId,
                businessDate,
                status: "DRAFT",
                notes: parsed.data.notes ?? null,
                lines: {
                    create: parsed.data.lines.map((l) => ({
                        ingredientId: l.ingredientId,
                        theoreticalQtyBase: l.theoreticalQtyBase,
                        actualQtyBase: l.actualQtyBase,
                        varianceQtyBase: l.varianceQtyBase,
                        varianceReasonCode: l.varianceReasonCode ?? null,
                    })),
                },
            },
            include: { lines: true },
        });
        return reconciliation;
    });
    app.patch("/inventory/reconciliations/:id/approve", async (req, reply) => {
        const { id } = req.params;
        const reconciliation = await app.prisma.inventoryReconciliation.findUnique({
            where: { id },
            include: { lines: true },
        });
        if (!reconciliation) {
            reply.code(404);
            return { error: "NOT_FOUND" };
        }
        if (reconciliation.status !== "DRAFT" && reconciliation.status !== "SUBMITTED") {
            reply.code(400);
            return { error: "INVALID_STATUS", message: "Reconciliation must be DRAFT or SUBMITTED to approve" };
        }
        await app.inventoryService.postReconciliationVariance({
            locationId: reconciliation.locationId,
            sourceId: id,
            lines: reconciliation.lines.map((l) => ({
                ingredientId: l.ingredientId,
                varianceQtyBase: Number(l.varianceQtyBase),
            })),
        });
        await app.prisma.inventoryReconciliation.update({
            where: { id },
            data: { status: "APPROVED" },
        });
        return { ok: true };
    });
    // PUT /admin/items/:id/recipe - replace recipe lines
    const recipeLineSchema = z.object({
        ingredientId: z.string(),
        qtyPerItem: z.number(),
        unitCode: z.string().min(1),
    });
    const recipeLineSizeSchema = z.object({
        ingredientId: z.string(),
        baseType: z.enum(["HOT", "ICED", "CONCENTRATED"]),
        sizeCode: z.string().min(1),
        qtyPerItem: z.number(),
        unitCode: z.string().min(1),
    });
    const putRecipeSchema = z.object({
        lines: z.array(recipeLineSchema),
        sizeLines: z.array(recipeLineSizeSchema).optional(),
    });
    /** Check if RecipeLineSize table exists (graceful fallback when migration not applied). */
    async function safeRecipeLineSizeFindMany(menuItemId) {
        try {
            const lines = await app.prisma.recipeLineSize.findMany({
                where: { menuItemId, deletedAt: null },
            });
            return { lines };
        }
        catch (err) {
            const msg = String(err?.message ?? "");
            const code = err?.code;
            if (code === "P2021" || /does not exist|RecipeLineSize.*does not exist|relation.*does not exist/i.test(msg)) {
                app.log?.warn?.({ msg: "RecipeLineSize table missing; per-size recipe unavailable until migration is applied." });
                return { lines: [], unavailable: true };
            }
            throw err;
        }
    }
    app.get("/items/:id/recipe", async (req, reply) => {
        const { id } = req.params;
        const item = await app.prisma.menuItem.findUnique({ where: { id } });
        if (!item) {
            reply.code(404);
            return { error: "NOT_FOUND" };
        }
        const [lines, sizeResult] = await Promise.all([
            app.prisma.recipeLine.findMany({
                where: { menuItemId: id, deletedAt: null },
            }),
            safeRecipeLineSizeFindMany(id),
        ]);
        const sizeLines = sizeResult.lines;
        const result = { lines, sizeLines };
        if (sizeResult.unavailable)
            result.recipeLineSizeUnavailable = true;
        return result;
    });
    app.put("/items/:id/recipe", async (req, reply) => {
        const { id } = req.params;
        const parsed = putRecipeSchema.safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const item = await app.prisma.menuItem.findUnique({
            where: { id },
            select: { id: true, deletedAt: true, hasSizes: true },
        });
        if (!item) {
            reply.code(404);
            return { error: "NOT_FOUND" };
        }
        if (item.deletedAt) {
            reply.code(400);
            return { error: "ITEM_DELETED", message: "Cannot edit a deleted item. Restore it first." };
        }
        // Validate sized recipe: no duplicate (ingredientId, baseType, sizeCode) in same variant
        if (item.hasSizes && parsed.data.sizeLines && parsed.data.sizeLines.length > 0) {
            const raw = parsed.data.sizeLines;
            const seen = new Map();
            const duplicates = [];
            for (const l of raw) {
                const key = `${l.ingredientId}__${l.baseType}__${l.sizeCode}`;
                if (seen.has(key)) {
                    duplicates.push({ baseType: l.baseType, sizeCode: l.sizeCode, ingredientId: l.ingredientId });
                }
                else {
                    seen.set(key, l);
                }
            }
            if (duplicates.length > 0) {
                reply.code(400);
                const example = duplicates[0];
                return {
                    error: "DUPLICATE_INGREDIENT_IN_SIZE_VARIANT",
                    message: `Duplicate ingredient in recipe for ${example.sizeCode} ${example.baseType}. Each ingredient may appear only once per size variant.`,
                    details: { duplicates },
                };
            }
        }
        const version = await bumpCatalogVersion(app.prisma);
        const menuItemId = id;
        // Check RecipeLineSize table exists when needed (graceful fallback if migration not applied)
        const needsRecipeLineSize = item.hasSizes; // we read/write sizeLines for hasSizes items
        let recipeLineSizeAvailable = true;
        if (needsRecipeLineSize) {
            try {
                await app.prisma.recipeLineSize.findFirst({ take: 1 });
            }
            catch (err) {
                const msg = String(err?.message ?? "");
                const code = err?.code;
                if (code === "P2021" || /does not exist|RecipeLineSize.*does not exist|relation.*does not exist/i.test(msg)) {
                    recipeLineSizeAvailable = false;
                    reply.code(503);
                    return {
                        error: "RECIPE_LINE_SIZE_TABLE_MISSING",
                        message: "Per-size recipe data requires the RecipeLineSize table. Run migrations: pnpm prisma migrate deploy (in apps/cloud-api). Base recipe editing works for non-sized items.",
                    };
                }
                throw err;
            }
        }
        // Full replace: hard-delete all recipe rows for this item, then insert current payload.
        // (Soft-delete was causing unique constraint violations: old rows still hold the composite key.)
        const runReplace = async () => {
            await app.prisma.$transaction(async (tx) => {
                await tx.recipeLine.deleteMany({ where: { menuItemId } });
                if (item.hasSizes && recipeLineSizeAvailable) {
                    await tx.recipeLineSize.deleteMany({ where: { menuItemId } });
                    if (parsed.data.sizeLines && parsed.data.sizeLines.length > 0) {
                        const raw = parsed.data.sizeLines;
                        const seen = new Map();
                        for (const l of raw) {
                            const key = `${l.ingredientId}__${l.baseType}__${l.sizeCode}`;
                            if (!seen.has(key))
                                seen.set(key, l);
                        }
                        const normalized = Array.from(seen.values());
                        if (normalized.length > 0) {
                            await tx.recipeLineSize.createMany({
                                data: normalized.map((l) => ({
                                    menuItemId,
                                    ingredientId: l.ingredientId,
                                    baseType: l.baseType,
                                    sizeCode: l.sizeCode,
                                    qtyPerItem: l.qtyPerItem,
                                    unitCode: l.unitCode,
                                    version,
                                })),
                            });
                        }
                    }
                }
                else {
                    if (parsed.data.lines.length > 0) {
                        await tx.recipeLine.createMany({
                            data: parsed.data.lines.map((l) => ({
                                menuItemId,
                                ingredientId: l.ingredientId,
                                qtyPerItem: l.qtyPerItem,
                                unitCode: l.unitCode,
                                version,
                            })),
                        });
                    }
                }
            });
        };
        try {
            await runReplace();
        }
        catch (err) {
            const isUniqueViolation = err?.code === "P2002" ||
                /Unique constraint failed/.test(String(err?.message ?? ""));
            if (isUniqueViolation) {
                reply.code(400);
                const sizeLines = item.hasSizes ? parsed.data.sizeLines ?? [] : [];
                const sample = sizeLines.length > 0
                    ? sizeLines[0]
                    : null;
                return {
                    error: "RECIPE_SAVE_CONFLICT",
                    message: "Recipe save failed: duplicate or conflicting rows. Ensure all existing recipe rows for this item were removed before insert.",
                    details: {
                        menuItemId,
                        hasSizes: item.hasSizes,
                        sizeLinesCount: sizeLines.length,
                        sampleKey: sample
                            ? `${sample.ingredientId}/${sample.baseType}/${sample.sizeCode}`
                            : null,
                    },
                };
            }
            throw err;
        }
        const [lines, sizeResult] = await Promise.all([
            app.prisma.recipeLine.findMany({
                where: { menuItemId, deletedAt: null },
            }),
            safeRecipeLineSizeFindMany(menuItemId),
        ]);
        const sizeLines = sizeResult.lines;
        const out = { lines, sizeLines };
        if (sizeResult.unavailable)
            out.recipeLineSizeUnavailable = true;
        return out;
    });
    // Categories - exclude deleted
    app.get("/categories", async () => {
        return app.prisma.category.findMany({
            where: { deletedAt: null },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            include: { subCategories: { where: { deletedAt: null }, orderBy: [{ sortOrder: "asc" }] } },
        });
    });
    app.post("/categories", async (req, reply) => {
        const parsed = z.object({ name: z.string().min(1), slug: z.string().optional(), sortOrder: z.number().optional() }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const baseSlug = parsed.data.slug?.trim()
            ? generateSlug(parsed.data.slug)
            : generateSlug(parsed.data.name);
        const slug = await ensureUniqueSlug(app.prisma, baseSlug || "category");
        return app.prisma.category.create({
            data: { name: parsed.data.name, slug, sortOrder: parsed.data.sortOrder ?? 0 },
        });
    });
    app.patch("/categories/:id", async (req, reply) => {
        const { id } = req.params;
        const parsed = z.object({ name: z.string().min(1).optional(), slug: z.string().optional(), sortOrder: z.number().optional() }).partial().safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const data = { ...parsed.data };
        if (data.slug !== undefined) {
            const baseSlug = generateSlug(data.slug) || "category";
            data.slug = await ensureUniqueSlug(app.prisma, baseSlug, id);
        }
        return app.prisma.category.update({ where: { id }, data });
    });
    app.delete("/categories/:id", async (req, reply) => {
        const { id } = req.params;
        const subCount = await app.prisma.subCategory.count({ where: { categoryId: id, deletedAt: null } });
        if (subCount > 0) {
            reply.code(400);
            return { error: "CATEGORY_NOT_EMPTY", message: "Cannot delete category while sub-categories exist." };
        }
        await app.prisma.category.update({ where: { id }, data: { deletedAt: new Date() } });
        return { ok: true };
    });
    app.post("/categories/reorder", async (req, reply) => {
        const parsed = reorderOrderSchema.safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten(), message: "order array of { id, sortOrder } required" };
        }
        const ids = parsed.data.order.map((o) => o.id);
        const existing = await app.prisma.category.findMany({ where: { id: { in: ids }, deletedAt: null }, select: { id: true } });
        const foundIds = new Set(existing.map((c) => c.id));
        const missing = ids.filter((id) => !foundIds.has(id));
        if (missing.length > 0) {
            reply.code(400);
            return { error: "INVALID_IDS", message: `Category ids not found: ${missing.join(", ")}` };
        }
        await app.prisma.$transaction(parsed.data.order.map(({ id, sortOrder }) => app.prisma.category.update({ where: { id }, data: { sortOrder } })));
        const list = await app.prisma.category.findMany({
            where: { id: { in: ids }, deletedAt: null },
            orderBy: { sortOrder: "asc" },
            include: { subCategories: { where: { deletedAt: null }, orderBy: [{ sortOrder: "asc" }] } },
        });
        return list;
    });
    app.post("/categories/:categoryId/subcategories", async (req, reply) => {
        const { categoryId } = req.params;
        const parsed = z.object({ name: z.string().min(1), sortOrder: z.number().optional() }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const cat = await app.prisma.category.findUnique({ where: { id: categoryId } });
        if (!cat || cat.deletedAt) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Category not found" };
        }
        return app.prisma.subCategory.create({
            data: { name: parsed.data.name, categoryId, sortOrder: parsed.data.sortOrder ?? 0 },
        });
    });
    // SubCategories
    app.post("/subcategories", async (req, reply) => {
        const parsed = z.object({ name: z.string().min(1), categoryId: z.string().min(1), sortOrder: z.number().optional() }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        return app.prisma.subCategory.create({
            data: { name: parsed.data.name, categoryId: parsed.data.categoryId, sortOrder: parsed.data.sortOrder ?? 0 },
        });
    });
    app.patch("/subcategories/:id", async (req, reply) => {
        const { id } = req.params;
        const parsed = z.object({ name: z.string().min(1).optional(), sortOrder: z.number().optional() }).partial().safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        return app.prisma.subCategory.update({ where: { id }, data: parsed.data });
    });
    app.delete("/subcategories/:id", async (req, reply) => {
        const { id } = req.params;
        const itemCount = await app.prisma.menuItem.count({ where: { subCategoryId: id, deletedAt: null } });
        if (itemCount > 0) {
            reply.code(409);
            return { error: "SUBCATEGORY_NOT_EMPTY", message: "Cannot delete: subcategory has items" };
        }
        await app.prisma.subCategory.update({ where: { id }, data: { deletedAt: new Date() } });
        return { ok: true };
    });
    app.post("/subcategories/reorder", async (req, reply) => {
        const parsed = reorderOrderSchema.safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten(), message: "order array of { id, sortOrder } required" };
        }
        const ids = parsed.data.order.map((o) => o.id);
        const existing = await app.prisma.subCategory.findMany({ where: { id: { in: ids }, deletedAt: null }, select: { id: true } });
        const foundIds = new Set(existing.map((s) => s.id));
        const missing = ids.filter((id) => !foundIds.has(id));
        if (missing.length > 0) {
            reply.code(400);
            return { error: "INVALID_IDS", message: `Subcategory ids not found: ${missing.join(", ")}` };
        }
        await app.prisma.$transaction(parsed.data.order.map(({ id, sortOrder }) => app.prisma.subCategory.update({ where: { id }, data: { sortOrder } })));
        const list = await app.prisma.subCategory.findMany({
            where: { id: { in: ids }, deletedAt: null },
            orderBy: { sortOrder: "asc" },
        });
        return list;
    });
    // MenuItemSize CRUD (per-item sizes)
    app.get("/items/:id/sizes", async (req, reply) => {
        const { id } = req.params;
        const item = await app.prisma.menuItem.findUnique({ where: { id }, select: { id: true } });
        if (!item) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Item not found" };
        }
        return app.prisma.menuItemSize.findMany({
            where: { menuItemId: id },
            orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
        });
    });
    app.post("/items/:id/sizes", async (req, reply) => {
        const { id } = req.params;
        const parsed = z.object({
            label: z.string().min(1),
            temp: drinkTempEnum.optional().default("ANY"),
            sortOrder: z.number().optional().default(0),
            isActive: z.boolean().optional().default(true),
        }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const item = await app.prisma.menuItem.findUnique({ where: { id }, select: { id: true } });
        if (!item) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Item not found" };
        }
        return app.prisma.menuItemSize.create({
            data: {
                menuItemId: id,
                label: parsed.data.label,
                temp: parsed.data.temp,
                sortOrder: parsed.data.sortOrder,
                isActive: parsed.data.isActive,
            },
        });
    });
    app.patch("/items/:itemId/sizes/:sizeId", async (req, reply) => {
        const { itemId, sizeId } = req.params;
        const parsed = z.object({
            label: z.string().min(1).optional(),
            temp: drinkTempEnum.optional(),
            sortOrder: z.number().optional(),
            isActive: z.boolean().optional(),
        }).partial().safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const existing = await app.prisma.menuItemSize.findUnique({
            where: { id: sizeId },
            select: { menuItemId: true },
        });
        if (!existing || existing.menuItemId !== itemId) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Size not found" };
        }
        return app.prisma.menuItemSize.update({
            where: { id: sizeId },
            data: parsed.data,
        });
    });
    app.delete("/items/:itemId/sizes/:sizeId", async (req, reply) => {
        const { itemId, sizeId } = req.params;
        const existing = await app.prisma.menuItemSize.findUnique({
            where: { id: sizeId },
            select: { menuItemId: true },
        });
        if (!existing || existing.menuItemId !== itemId) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Size not found" };
        }
        await app.prisma.menuItemSize.update({
            where: { id: sizeId },
            data: { isActive: false },
        });
        return { ok: true };
    });
    // Option groups (modifiers)
    app.get("/option-groups", async () => {
        return app.prisma.menuOptionGroup.findMany({
            include: {
                options: {
                    orderBy: { sortOrder: "asc" },
                    include: { recipeLines: { include: { ingredient: true } } },
                },
                sections: { orderBy: { sortOrder: "asc" } },
                defaultOption: true,
            },
            orderBy: { id: "asc" },
        });
    });
    app.post("/option-groups", async (req, reply) => {
        const parsed = z.object({ name: z.string().min(1), required: z.boolean().optional(), multi: z.boolean().optional(), isSizeGroup: z.boolean().optional(), trackRecipeConsumption: z.boolean().optional() }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        return app.prisma.menuOptionGroup.create({
            data: {
                name: parsed.data.name,
                required: parsed.data.required ?? false,
                multi: parsed.data.multi ?? false,
                isSizeGroup: parsed.data.isSizeGroup ?? false,
                trackRecipeConsumption: parsed.data.trackRecipeConsumption ?? false,
            },
        });
    });
    app.patch("/option-groups/:id", async (req, reply) => {
        const { id } = req.params;
        const parsed = z
            .object({
            name: z.string().min(1).optional(),
            required: z.boolean().optional(),
            multi: z.boolean().optional(),
            isSizeGroup: z.boolean().optional(),
            defaultOptionId: z.string().nullable().optional(),
            trackRecipeConsumption: z.boolean().optional(),
        })
            .partial()
            .safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const data = { ...parsed.data };
        if ("defaultOptionId" in parsed.data && parsed.data.defaultOptionId != null) {
            const opt = await app.prisma.menuOption.findFirst({
                where: { id: parsed.data.defaultOptionId, groupId: id },
                select: { id: true },
            });
            if (!opt) {
                reply.code(400);
                return { error: "INVALID_DEFAULT_OPTION", message: "Default option must belong to this modifier section" };
            }
        }
        return app.prisma.menuOptionGroup.update({ where: { id }, data });
    });
    app.delete("/option-groups/:groupId/sections/:sectionId", async (req, reply) => {
        const { sectionId } = req.params;
        const section = await app.prisma.menuOptionGroupSection.findUnique({ where: { id: sectionId }, select: { id: true, isSystem: true, isDeletable: true } });
        if (!section) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Section not found" };
        }
        if (!section.isDeletable || section.isSystem) {
            reply.code(400);
            return { error: "SECTION_LOCKED", message: "This section is locked and cannot be deleted." };
        }
        await app.prisma.menuOptionGroupSection.delete({ where: { id: sectionId } });
        return { ok: true };
    });
    app.delete("/option-groups/:id", async (req, reply) => {
        const { id } = req.params;
        const group = await app.prisma.menuOptionGroup.findUnique({ where: { id }, select: { id: true, name: true, isSystem: true, isDeletable: true } });
        if (!group) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Option group not found" };
        }
        if (!group.isDeletable || group.isSystem) {
            reply.code(400);
            return { error: "GROUP_LOCKED", message: "This option group is locked and cannot be deleted." };
        }
        await app.prisma.menuOptionGroup.delete({ where: { id } });
        return { ok: true };
    });
    app.post("/option-groups/:groupId/options", async (req, reply) => {
        const { groupId } = req.params;
        const parsed = z.object({ name: z.string().min(1), priceDelta: z.number().optional() }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        return app.prisma.menuOption.create({
            data: { groupId, name: parsed.data.name, priceDelta: parsed.data.priceDelta ?? 0 },
        });
    });
    app.delete("/option-groups/:groupId/options/:optionId", async (req, reply) => {
        await app.prisma.menuOption.deleteMany({ where: { id: req.params.optionId, groupId: req.params.groupId } });
        return { ok: true };
    });
    // Option choice recipe lines (for modifiers with trackRecipeConsumption)
    app.get("/option-groups/:groupId/options/:optionId/recipe", async (req, reply) => {
        const { groupId, optionId } = req.params;
        const opt = await app.prisma.menuOption.findFirst({
            where: { id: optionId, groupId },
            include: { recipeLines: { include: { ingredient: true } } },
        });
        if (!opt) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Option not found" };
        }
        return { lines: opt.recipeLines };
    });
    app.put("/option-groups/:groupId/options/:optionId/recipe", async (req, reply) => {
        const { groupId, optionId } = req.params;
        const opt = await app.prisma.menuOption.findFirst({
            where: { id: optionId, groupId },
            include: { group: true },
        });
        if (!opt) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Option not found" };
        }
        if (!opt.group.trackRecipeConsumption) {
            reply.code(400);
            return { error: "RECIPE_DISABLED", message: "Enable 'Track recipe consumption' on the modifier section first." };
        }
        const parsed = z.object({
            lines: z.array(z.object({
                ingredientId: z.string().min(1),
                qtyPerItem: z.number().positive(),
                unitCode: z.string().min(1),
            })),
        }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        for (const line of parsed.data.lines) {
            const ing = await app.prisma.ingredient.findUnique({ where: { id: line.ingredientId }, select: { id: true } });
            if (!ing) {
                reply.code(400);
                return { error: "INVALID_INGREDIENT", message: `Ingredient ${line.ingredientId} not found` };
            }
        }
        await app.prisma.optionChoiceRecipeLine.deleteMany({ where: { optionId } });
        if (parsed.data.lines.length > 0) {
            await app.prisma.optionChoiceRecipeLine.createMany({
                data: parsed.data.lines.map((l) => ({
                    optionId,
                    ingredientId: l.ingredientId,
                    qtyPerItem: l.qtyPerItem,
                    unitCode: l.unitCode,
                })),
            });
        }
        const lines = await app.prisma.optionChoiceRecipeLine.findMany({
            where: { optionId },
            include: { ingredient: true },
        });
        return { lines };
    });
    // Add-on Groups CRUD (group-based architecture)
    app.get("/add-on-groups", async () => {
        return app.prisma.addOnGroup.findMany({
            include: { options: { include: { recipeLines: { include: { ingredient: true } } }, orderBy: { sortOrder: "asc" } } },
            orderBy: { sortOrder: "asc" },
        });
    });
    app.post("/add-on-groups", async (req, reply) => {
        const parsed = z.object({
            name: z.string().min(1, "Group name is required"),
            isActive: z.boolean().optional().default(true),
            sortOrder: z.number().int().optional(),
        }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const maxOrder = await app.prisma.addOnGroup.aggregate({ _max: { sortOrder: true } });
        const sortOrder = parsed.data.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1;
        return app.prisma.addOnGroup.create({
            data: { name: parsed.data.name, isActive: parsed.data.isActive, sortOrder },
            include: { options: true },
        });
    });
    app.patch("/add-on-groups/:id", async (req, reply) => {
        const { id } = req.params;
        const parsed = z.object({
            name: z.string().min(1).optional(),
            isActive: z.boolean().optional(),
            sortOrder: z.number().int().optional(),
        }).partial().safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const existing = await app.prisma.addOnGroup.findUnique({ where: { id } });
        if (!existing) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Add-on group not found" };
        }
        return app.prisma.addOnGroup.update({ where: { id }, data: parsed.data, include: { options: true } });
    });
    app.delete("/add-on-groups/:id", async (req, reply) => {
        const { id } = req.params;
        const existing = await app.prisma.addOnGroup.findUnique({ where: { id }, include: { menuItemLinks: { take: 1 } } });
        if (!existing) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Add-on group not found" };
        }
        if (existing.menuItemLinks.length > 0) {
            reply.code(400);
            return { error: "GROUP_IN_USE", message: "This add-on group is used by items. Remove it from items first." };
        }
        await app.prisma.addOnGroup.delete({ where: { id } });
        return { ok: true };
    });
    app.post("/add-on-groups/:groupId/options", async (req, reply) => {
        const { groupId } = req.params;
        const parsed = z.object({
            name: z.string().min(1, "Option name is required"),
            priceCents: z.number().int().min(0).optional(),
            isActive: z.boolean().optional().default(true),
            sortOrder: z.number().int().optional(),
        }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const group = await app.prisma.addOnGroup.findUnique({ where: { id: groupId } });
        if (!group) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Add-on group not found" };
        }
        const maxOrder = await app.prisma.addOnOption.aggregate({ where: { groupId }, _max: { sortOrder: true } });
        const sortOrder = parsed.data.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1;
        return app.prisma.addOnOption.create({
            data: {
                groupId,
                name: parsed.data.name,
                priceCents: parsed.data.priceCents ?? 0,
                isActive: parsed.data.isActive ?? true,
                sortOrder,
            },
            include: { recipeLines: { include: { ingredient: true } } },
        });
    });
    app.patch("/add-on-groups/:groupId/options/:optionId", async (req, reply) => {
        const { groupId, optionId } = req.params;
        const parsed = z.object({
            name: z.string().min(1).optional(),
            priceCents: z.number().int().min(0).optional(),
            isActive: z.boolean().optional(),
            sortOrder: z.number().int().optional(),
        }).partial().safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const opt = await app.prisma.addOnOption.findFirst({ where: { id: optionId, groupId } });
        if (!opt) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Add-on option not found" };
        }
        return app.prisma.addOnOption.update({
            where: { id: optionId },
            data: parsed.data,
            include: { recipeLines: { include: { ingredient: true } } },
        });
    });
    app.delete("/add-on-groups/:groupId/options/:optionId", async (req, reply) => {
        const { groupId, optionId } = req.params;
        const opt = await app.prisma.addOnOption.findFirst({ where: { id: optionId, groupId } });
        if (!opt) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Add-on option not found" };
        }
        await app.prisma.addOnOption.delete({ where: { id: optionId } });
        return { ok: true };
    });
    app.put("/add-on-groups/:groupId/options/:optionId/recipe", async (req, reply) => {
        const { groupId, optionId } = req.params;
        const opt = await app.prisma.addOnOption.findFirst({ where: { id: optionId, groupId } });
        if (!opt) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Add-on option not found" };
        }
        const parsed = z.object({
            lines: z.array(z.object({
                ingredientId: z.string().min(1),
                qtyPerItem: z.number().positive(),
                unitCode: z.string().min(1),
            })),
        }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        for (const line of parsed.data.lines) {
            const ing = await app.prisma.ingredient.findUnique({ where: { id: line.ingredientId }, select: { id: true } });
            if (!ing) {
                reply.code(400);
                return { error: "INVALID_INGREDIENT", message: `Ingredient ${line.ingredientId} not found` };
            }
        }
        await app.prisma.addOnOptionRecipeLine.deleteMany({ where: { optionId } });
        if (parsed.data.lines.length > 0) {
            await app.prisma.addOnOptionRecipeLine.createMany({
                data: parsed.data.lines.map((l) => ({
                    optionId,
                    ingredientId: l.ingredientId,
                    qtyPerItem: l.qtyPerItem,
                    unitCode: l.unitCode,
                })),
            });
        }
        const lines = await app.prisma.addOnOptionRecipeLine.findMany({
            where: { optionId },
            include: { ingredient: true },
        });
        return { lines };
    });
    // Substitute Groups CRUD (group-based architecture)
    app.get("/substitute-groups", async () => {
        return app.prisma.substituteGroup.findMany({
            include: { options: { include: { recipeLines: { include: { ingredient: true } } }, orderBy: { sortOrder: "asc" } } },
            orderBy: { sortOrder: "asc" },
        });
    });
    app.post("/substitute-groups", async (req, reply) => {
        const parsed = z.object({
            name: z.string().min(1, "Group name is required"),
            isActive: z.boolean().optional().default(true),
            sortOrder: z.number().int().optional(),
        }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const maxOrder = await app.prisma.substituteGroup.aggregate({ _max: { sortOrder: true } });
        const sortOrder = parsed.data.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1;
        return app.prisma.substituteGroup.create({
            data: { name: parsed.data.name, isActive: parsed.data.isActive, sortOrder },
            include: { options: true },
        });
    });
    app.patch("/substitute-groups/:id", async (req, reply) => {
        const { id } = req.params;
        const parsed = z.object({
            name: z.string().min(1).optional(),
            isActive: z.boolean().optional(),
            sortOrder: z.number().int().optional(),
        }).partial().safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const existing = await app.prisma.substituteGroup.findUnique({ where: { id } });
        if (!existing) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Substitute group not found" };
        }
        return app.prisma.substituteGroup.update({ where: { id }, data: parsed.data, include: { options: true } });
    });
    app.delete("/substitute-groups/:id", async (req, reply) => {
        const { id } = req.params;
        const existing = await app.prisma.substituteGroup.findUnique({ where: { id }, include: { menuItemLinks: { take: 1 } } });
        if (!existing) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Substitute group not found" };
        }
        if (existing.menuItemLinks.length > 0) {
            reply.code(400);
            return { error: "GROUP_IN_USE", message: "This substitute group is used by items. Remove it from items first." };
        }
        await app.prisma.substituteGroup.delete({ where: { id } });
        return { ok: true };
    });
    app.post("/substitute-groups/:groupId/options", async (req, reply) => {
        const { groupId } = req.params;
        const parsed = z.object({
            name: z.string().min(1, "Option name is required"),
            priceCents: z.number().int().min(0).optional(),
            isActive: z.boolean().optional().default(true),
            sortOrder: z.number().int().optional(),
        }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const group = await app.prisma.substituteGroup.findUnique({ where: { id: groupId } });
        if (!group) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Substitute group not found" };
        }
        const maxOrder = await app.prisma.substituteOption.aggregate({ where: { groupId }, _max: { sortOrder: true } });
        const sortOrder = parsed.data.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1;
        return app.prisma.substituteOption.create({
            data: {
                groupId,
                name: parsed.data.name,
                priceCents: parsed.data.priceCents ?? 0,
                isActive: parsed.data.isActive ?? true,
                sortOrder,
            },
            include: { recipeLines: { include: { ingredient: true } } },
        });
    });
    app.patch("/substitute-groups/:groupId/options/:optionId", async (req, reply) => {
        const { groupId, optionId } = req.params;
        const parsed = z.object({
            name: z.string().min(1).optional(),
            priceCents: z.number().int().min(0).optional(),
            isActive: z.boolean().optional(),
            sortOrder: z.number().int().optional(),
        }).partial().safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const opt = await app.prisma.substituteOption.findFirst({ where: { id: optionId, groupId } });
        if (!opt) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Substitute option not found" };
        }
        return app.prisma.substituteOption.update({
            where: { id: optionId },
            data: parsed.data,
            include: { recipeLines: { include: { ingredient: true } } },
        });
    });
    app.delete("/substitute-groups/:groupId/options/:optionId", async (req, reply) => {
        const { groupId, optionId } = req.params;
        const opt = await app.prisma.substituteOption.findFirst({ where: { id: optionId, groupId } });
        if (!opt) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Substitute option not found" };
        }
        await app.prisma.substituteOption.delete({ where: { id: optionId } });
        return { ok: true };
    });
    app.put("/substitute-groups/:groupId/options/:optionId/recipe", async (req, reply) => {
        const { groupId, optionId } = req.params;
        const opt = await app.prisma.substituteOption.findFirst({ where: { id: optionId, groupId } });
        if (!opt) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Substitute option not found" };
        }
        const parsed = z.object({
            lines: z.array(z.object({
                ingredientId: z.string().min(1),
                qtyPerItem: z.number().positive(),
                unitCode: z.string().min(1),
            })),
        }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        for (const line of parsed.data.lines) {
            const ing = await app.prisma.ingredient.findUnique({ where: { id: line.ingredientId }, select: { id: true } });
            if (!ing) {
                reply.code(400);
                return { error: "INVALID_INGREDIENT", message: `Ingredient ${line.ingredientId} not found` };
            }
        }
        await app.prisma.substituteOptionRecipeLine.deleteMany({ where: { optionId } });
        if (parsed.data.lines.length > 0) {
            await app.prisma.substituteOptionRecipeLine.createMany({
                data: parsed.data.lines.map((l) => ({
                    optionId,
                    ingredientId: l.ingredientId,
                    qtyPerItem: l.qtyPerItem,
                    unitCode: l.unitCode,
                })),
            });
        }
        const lines = await app.prisma.substituteOptionRecipeLine.findMany({
            where: { optionId },
            include: { ingredient: true },
        });
        return { lines };
    });
    // Add-ons CRUD (legacy flat - deprecated, use add-on-groups)
    app.get("/add-ons", async () => {
        return app.prisma.addOn.findMany({
            include: { recipeLines: { include: { ingredient: true } } },
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        });
    });
    app.post("/add-ons", async (req, reply) => {
        const parsed = z.object({
            name: z.string().min(1),
            priceCents: z.number().int().min(0).optional(),
            isActive: z.boolean().optional(),
            sortOrder: z.number().int().optional(),
        }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const maxOrder = await app.prisma.addOn.aggregate({ _max: { sortOrder: true } });
        const sortOrder = parsed.data.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1;
        return app.prisma.addOn.create({
            data: {
                name: parsed.data.name,
                priceCents: parsed.data.priceCents ?? 0,
                isActive: parsed.data.isActive ?? true,
                sortOrder,
            },
        });
    });
    app.patch("/add-ons/:id", async (req, reply) => {
        const { id } = req.params;
        const parsed = z.object({
            name: z.string().min(1).optional(),
            priceCents: z.number().int().min(0).optional(),
            isActive: z.boolean().optional(),
            sortOrder: z.number().int().optional(),
        }).partial().safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const existing = await app.prisma.addOn.findUnique({ where: { id } });
        if (!existing) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Add-on not found" };
        }
        return app.prisma.addOn.update({ where: { id }, data: parsed.data });
    });
    app.delete("/add-ons/:id", async (req, reply) => {
        const { id } = req.params;
        const existing = await app.prisma.addOn.findUnique({ where: { id }, include: { menuItemLinks: { take: 1 } } });
        if (!existing) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Add-on not found" };
        }
        if (existing.menuItemLinks.length > 0) {
            reply.code(400);
            return { error: "ADDON_IN_USE", message: "This add-on is used by items. Remove it from items first, or deactivate instead of deleting." };
        }
        await app.prisma.addOn.delete({ where: { id } });
        return { ok: true };
    });
    app.get("/add-ons/:id/recipe", async (req, reply) => {
        const addOn = await app.prisma.addOn.findUnique({
            where: { id: req.params.id },
            include: { recipeLines: { include: { ingredient: true } } },
        });
        if (!addOn) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Add-on not found" };
        }
        return { lines: addOn.recipeLines };
    });
    app.put("/add-ons/:id/recipe", async (req, reply) => {
        const { id } = req.params;
        const addOn = await app.prisma.addOn.findUnique({ where: { id } });
        if (!addOn) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Add-on not found" };
        }
        const parsed = z.object({
            lines: z.array(z.object({
                ingredientId: z.string().min(1),
                qtyPerItem: z.number().positive(),
                unitCode: z.string().min(1),
            })),
        }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        for (const line of parsed.data.lines) {
            const ing = await app.prisma.ingredient.findUnique({ where: { id: line.ingredientId }, select: { id: true } });
            if (!ing) {
                reply.code(400);
                return { error: "INVALID_INGREDIENT", message: `Ingredient ${line.ingredientId} not found` };
            }
        }
        await app.prisma.addOnRecipeLine.deleteMany({ where: { addOnId: id } });
        if (parsed.data.lines.length > 0) {
            await app.prisma.addOnRecipeLine.createMany({
                data: parsed.data.lines.map((l) => ({
                    addOnId: id,
                    ingredientId: l.ingredientId,
                    qtyPerItem: l.qtyPerItem,
                    unitCode: l.unitCode,
                })),
            });
        }
        const lines = await app.prisma.addOnRecipeLine.findMany({
            where: { addOnId: id },
            include: { ingredient: true },
        });
        return { lines };
    });
    // Substitutes CRUD (flat milk types - primary architecture)
    app.get("/substitutes", async () => {
        return app.prisma.substitute.findMany({
            include: {
                prices: { include: { size: true } },
                recipeConsumption: { include: { size: true, ingredient: true } },
            },
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        });
    });
    app.post("/substitutes", async (req, reply) => {
        const parsed = z.object({
            name: z.string().min(1),
            isActive: z.boolean().optional(),
            sortOrder: z.number().int().optional(),
        }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const maxOrder = await app.prisma.substitute.aggregate({ _max: { sortOrder: true } });
        const sortOrder = parsed.data.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1;
        return app.prisma.substitute.create({
            data: {
                name: parsed.data.name,
                isActive: parsed.data.isActive ?? true,
                sortOrder,
            },
        });
    });
    app.patch("/substitutes/:id", async (req, reply) => {
        const { id } = req.params;
        const parsed = z.object({
            name: z.string().min(1).optional(),
            isActive: z.boolean().optional(),
            sortOrder: z.number().int().optional(),
        }).partial().safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const existing = await app.prisma.substitute.findUnique({ where: { id } });
        if (!existing) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Substitute not found" };
        }
        return app.prisma.substitute.update({ where: { id }, data: parsed.data });
    });
    app.delete("/substitutes/:id", async (req, reply) => {
        const { id } = req.params;
        const existing = await app.prisma.substitute.findUnique({ where: { id }, include: { menuItemLinks: { take: 1 }, asDefaultFor: { take: 1 } } });
        if (!existing) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Substitute not found" };
        }
        if (existing.menuItemLinks.length > 0 || existing.asDefaultFor.length > 0) {
            reply.code(400);
            return { error: "SUBSTITUTE_IN_USE", message: "This substitute is used by items. Remove it from items first, or deactivate instead of deleting." };
        }
        await app.prisma.substitute.delete({ where: { id } });
        return { ok: true };
    });
    // Substitute prices by size + mode (primary pricing for milk substitutes)
    const drinkModeSchema = z.enum(["ICED", "HOT", "CONCENTRATED"]);
    app.put("/substitutes/:id/prices", async (req, reply) => {
        const { id } = req.params;
        const sub = await app.prisma.substitute.findUnique({ where: { id } });
        if (!sub) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Substitute not found" };
        }
        const parsed = z.object({
            prices: z.array(z.object({
                sizeId: z.string(),
                mode: drinkModeSchema,
                priceCents: z.number().int().min(0),
            })),
        }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const sizesGroup = await app.prisma.menuSettingGroup.findUnique({ where: { key: SIZES_GROUP_KEY }, include: { menuSizes: true } });
        if (!sizesGroup) {
            reply.code(404);
            return { error: "SIZES_GROUP_NOT_FOUND", message: "Sizes group not found. Run db:seed." };
        }
        const validSizeIds = new Set(sizesGroup.menuSizes.map((s) => s.id));
        for (const p of parsed.data.prices) {
            if (!validSizeIds.has(p.sizeId)) {
                reply.code(400);
                return { error: "INVALID_SIZE_ID", message: `Size id ${p.sizeId} is not in Menu Settings > Sizes` };
            }
        }
        await bumpCatalogVersion(app.prisma);
        await app.prisma.substitutePrice.deleteMany({ where: { substituteId: id } });
        if (parsed.data.prices.length > 0) {
            await app.prisma.substitutePrice.createMany({
                data: parsed.data.prices.map((p) => ({ substituteId: id, sizeId: p.sizeId, mode: p.mode, priceCents: p.priceCents })),
                skipDuplicates: true,
            });
        }
        const prices = await app.prisma.substitutePrice.findMany({
            where: { substituteId: id },
            include: { size: true },
        });
        return { prices };
    });
    // Substitute recipe consumption by size + mode (global matrix: ingredient + qty + unit)
    app.put("/substitutes/:id/recipe-consumption", async (req, reply) => {
        const { id } = req.params;
        const sub = await app.prisma.substitute.findUnique({ where: { id } });
        if (!sub) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Substitute not found" };
        }
        const parsed = z.object({
            rows: z.array(z.object({
                sizeId: z.string(),
                mode: drinkModeSchema,
                ingredientId: z.string().min(1),
                qtyPerItem: z.number().min(0),
                unitCode: z.string().min(1),
            })),
        }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const sizesGroup = await app.prisma.menuSettingGroup.findUnique({ where: { key: SIZES_GROUP_KEY }, include: { menuSizes: true } });
        if (!sizesGroup) {
            reply.code(404);
            return { error: "SIZES_GROUP_NOT_FOUND", message: "Sizes group not found. Run db:seed." };
        }
        const validSizeIds = new Set(sizesGroup.menuSizes.map((s) => s.id));
        for (const r of parsed.data.rows) {
            if (!validSizeIds.has(r.sizeId)) {
                reply.code(400);
                return { error: "INVALID_SIZE_ID", message: `Size id ${r.sizeId} is not in Menu Settings > Sizes` };
            }
            const ing = await app.prisma.ingredient.findUnique({ where: { id: r.ingredientId }, select: { id: true } });
            if (!ing) {
                reply.code(400);
                return { error: "INVALID_INGREDIENT", message: `Ingredient ${r.ingredientId} not found` };
            }
        }
        await bumpCatalogVersion(app.prisma);
        await app.prisma.substituteRecipeConsumption.deleteMany({ where: { substituteId: id } });
        if (parsed.data.rows.length > 0) {
            await app.prisma.substituteRecipeConsumption.createMany({
                data: parsed.data.rows.map((r) => ({
                    substituteId: id,
                    sizeId: r.sizeId,
                    mode: r.mode,
                    ingredientId: r.ingredientId,
                    qtyPerItem: r.qtyPerItem,
                    unitCode: r.unitCode,
                })),
                skipDuplicates: true,
            });
        }
        const recipeConsumption = await app.prisma.substituteRecipeConsumption.findMany({
            where: { substituteId: id },
            include: { size: true, ingredient: true },
        });
        return { recipeConsumption };
    });
    // Link item to flat substitutes + default milk: PUT /admin/items/:id/substitutes (primary)
    // Payload: { substituteIds: string[], defaultSubstituteId: string | null }
    app.put("/items/:id/substitutes", async (req, reply) => {
        const { id } = req.params;
        const parsed = z.object({
            substituteIds: z.array(z.string()),
            defaultSubstituteId: z.string().nullable(),
        }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const item = await app.prisma.menuItem.findUnique({ where: { id }, select: { id: true, deletedAt: true } });
        if (!item) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Item not found" };
        }
        if (item.deletedAt) {
            reply.code(400);
            return { error: "ITEM_DELETED", message: "Cannot edit a deleted item. Restore it first." };
        }
        const substituteIds = parsed.data.substituteIds;
        if (substituteIds.length > 0) {
            const uniqueIds = new Set(substituteIds);
            if (uniqueIds.size !== substituteIds.length) {
                reply.code(400);
                return { error: "DUPLICATE_SUBSTITUTE", message: "substituteIds must be unique" };
            }
            const defaultId = parsed.data.defaultSubstituteId;
            if (!defaultId) {
                reply.code(400);
                return { error: "DEFAULT_MILK_REQUIRED", message: "Default milk is required when substitutes are enabled. Set defaultSubstituteId." };
            }
            if (!substituteIds.includes(defaultId)) {
                reply.code(400);
                return { error: "DEFAULT_MUST_BE_ALLOWED", message: "Default milk must be one of the allowed substitutes for this item" };
            }
            const subs = await app.prisma.substitute.findMany({ where: { id: { in: substituteIds } }, select: { id: true, isActive: true } });
            if (subs.length !== substituteIds.length) {
                reply.code(400);
                return { error: "INVALID_SUBSTITUTE", message: "One or more substitutes not found" };
            }
            const inactive = subs.find((s) => !s.isActive);
            if (inactive) {
                reply.code(400);
                return { error: "SUBSTITUTE_INACTIVE", message: "All substitutes must be active" };
            }
        }
        await app.prisma.menuItemSubstitute.deleteMany({ where: { itemId: id } });
        if (substituteIds.length > 0) {
            await app.prisma.menuItemSubstitute.createMany({
                data: substituteIds.map((substituteId) => ({ itemId: id, substituteId })),
                skipDuplicates: true,
            });
            await app.prisma.menuItem.update({
                where: { id },
                data: { defaultSubstituteId: parsed.data.defaultSubstituteId },
            });
        }
        else {
            await app.prisma.menuItem.update({
                where: { id },
                data: { defaultSubstituteId: null },
            });
        }
        const links = await app.prisma.menuItemSubstitute.findMany({
            where: { itemId: id },
            include: { substitute: { select: { id: true, name: true, isActive: true } } },
        });
        const updated = await app.prisma.menuItem.findUnique({
            where: { id },
            select: { defaultSubstituteId: true, defaultSubstitute: { select: { id: true, name: true } } },
        });
        return { substituteLinks: links, defaultSubstituteId: updated?.defaultSubstituteId ?? null, defaultSubstitute: updated?.defaultSubstitute ?? null };
    });
    // Link item to option groups: PUT /admin/items/:id/option-groups
    app.put("/items/:id/option-groups", async (req, reply) => {
        const { id } = req.params;
        const parsed = z.object({ groupIds: z.array(z.string()) }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const item = await app.prisma.menuItem.findUnique({ where: { id }, select: { id: true, deletedAt: true } });
        if (!item) {
            reply.code(404);
            return { error: "NOT_FOUND" };
        }
        if (item.deletedAt) {
            reply.code(400);
            return { error: "ITEM_DELETED", message: "Cannot edit a deleted item. Restore it first." };
        }
        await app.prisma.menuItemOptionGroup.deleteMany({ where: { itemId: id } });
        if (parsed.data.groupIds.length > 0) {
            await app.prisma.menuItemOptionGroup.createMany({
                data: parsed.data.groupIds.map((groupId) => ({ itemId: id, groupId })),
                skipDuplicates: true,
            });
        }
        const links = await app.prisma.menuItemOptionGroup.findMany({
            where: { itemId: id },
            include: { group: { include: { options: true, defaultOption: true } } },
        });
        return { optionGroupLinks: links };
    });
    // Link item to add-on groups: PUT /admin/items/:id/add-on-groups
    app.put("/items/:id/add-on-groups", async (req, reply) => {
        const { id } = req.params;
        const parsed = z.object({ groupIds: z.array(z.string()) }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const item = await app.prisma.menuItem.findUnique({ where: { id }, select: { id: true, deletedAt: true } });
        if (!item) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Item not found" };
        }
        if (item.deletedAt) {
            reply.code(400);
            return { error: "ITEM_DELETED", message: "Cannot edit a deleted item. Restore it first." };
        }
        if (parsed.data.groupIds.length > 0) {
            const groups = await app.prisma.addOnGroup.findMany({ where: { id: { in: parsed.data.groupIds } }, select: { id: true, isActive: true } });
            if (groups.length !== parsed.data.groupIds.length) {
                reply.code(400);
                return { error: "INVALID_ADDON_GROUP", message: "One or more add-on groups not found" };
            }
        }
        await app.prisma.menuItemAddOnGroup.deleteMany({ where: { itemId: id } });
        if (parsed.data.groupIds.length > 0) {
            await app.prisma.menuItemAddOnGroup.createMany({
                data: parsed.data.groupIds.map((groupId) => ({ itemId: id, groupId })),
                skipDuplicates: true,
            });
        }
        const links = await app.prisma.menuItemAddOnGroup.findMany({
            where: { itemId: id },
            include: { group: { include: { options: { include: { recipeLines: { include: { ingredient: true } } } } } } },
        });
        return { addOnGroupLinks: links };
    });
    // Link item to substitute groups + default milk: PUT /admin/items/:id/substitute-groups
    app.put("/items/:id/substitute-groups", async (req, reply) => {
        const { id } = req.params;
        const parsed = z.object({
            groupIds: z.array(z.string()),
            defaultSubstituteOptionId: z.string().nullable(),
        }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const item = await app.prisma.menuItem.findUnique({ where: { id }, select: { id: true, deletedAt: true } });
        if (!item) {
            reply.code(404);
            return { error: "NOT_FOUND", message: "Item not found" };
        }
        if (item.deletedAt) {
            reply.code(400);
            return { error: "ITEM_DELETED", message: "Cannot edit a deleted item. Restore it first." };
        }
        if (parsed.data.groupIds.length > 0) {
            const groups = await app.prisma.substituteGroup.findMany({
                where: { id: { in: parsed.data.groupIds } },
                select: { id: true, isActive: true },
            });
            if (groups.length !== parsed.data.groupIds.length) {
                reply.code(400);
                return { error: "INVALID_SUBSTITUTE_GROUP", message: "One or more substitute groups not found" };
            }
            const defaultId = parsed.data.defaultSubstituteOptionId;
            if (!defaultId) {
                reply.code(400);
                return { error: "DEFAULT_MILK_REQUIRED", message: "Default milk is required when substitutes are enabled. Set defaultSubstituteOptionId." };
            }
            const defaultOpt = await app.prisma.substituteOption.findUnique({
                where: { id: defaultId },
                select: { id: true, groupId: true, isActive: true },
            });
            if (!defaultOpt) {
                reply.code(400);
                return { error: "DEFAULT_NOT_FOUND", message: "Default substitute option not found" };
            }
            if (!defaultOpt.isActive) {
                reply.code(400);
                return { error: "DEFAULT_INACTIVE", message: "Default milk option must be active" };
            }
            if (!parsed.data.groupIds.includes(defaultOpt.groupId)) {
                reply.code(400);
                return { error: "DEFAULT_MUST_BE_IN_SELECTED_GROUP", message: "Default milk must be from one of the selected substitute groups" };
            }
        }
        await app.prisma.menuItemSubstituteGroup.deleteMany({ where: { itemId: id } });
        if (parsed.data.groupIds.length > 0) {
            await app.prisma.menuItemSubstituteGroup.createMany({
                data: parsed.data.groupIds.map((groupId) => ({ itemId: id, groupId })),
                skipDuplicates: true,
            });
            await app.prisma.menuItem.update({
                where: { id },
                data: { defaultSubstituteOptionId: parsed.data.defaultSubstituteOptionId },
            });
        }
        else {
            await app.prisma.menuItem.update({
                where: { id },
                data: { defaultSubstituteOptionId: null },
            });
        }
        const links = await app.prisma.menuItemSubstituteGroup.findMany({
            where: { itemId: id },
            include: { group: { include: { options: { include: { recipeLines: { include: { ingredient: true } } } } } } },
        });
        const updated = await app.prisma.menuItem.findUnique({
            where: { id },
            select: { defaultSubstituteOptionId: true, defaultSubstituteOption: true },
        });
        return { substituteGroupLinks: links, defaultSubstituteOptionId: updated?.defaultSubstituteOptionId ?? null, defaultSubstituteOption: updated?.defaultSubstituteOption ?? null };
    });
    // Export transactions (must be before /transactions to avoid path conflicts)
    app.get("/transactions/export", async (req, reply) => {
        const storeId = req.query.storeId || "store_1";
        const fromStr = req.query.from;
        const toStr = req.query.to;
        if (!fromStr || !toStr) {
            reply.code(400);
            return { error: "INVALID_QUERY", message: "from and to date required (YYYY-MM-DD)" };
        }
        const from = new Date(fromStr + "T00:00:00.000Z");
        const to = new Date(toStr + "T23:59:59.999Z");
        if (isNaN(from.getTime()) || isNaN(to.getTime())) {
            reply.code(400);
            return { error: "INVALID_DATES", message: "Invalid date format" };
        }
        if (from > to) {
            reply.code(400);
            return { error: "INVALID_RANGE", message: "From date must be before or equal to To date" };
        }
        const maxExport = 10000;
        const items = await app.prisma.syncedTransaction.findMany({
            where: { storeId, createdAt: { gte: from, lte: to } },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: maxExport + 1,
        });
        if (items.length > maxExport) {
            reply.code(400);
            return { error: "RANGE_TOO_LARGE", message: `Date range has more than ${maxExport} transactions. Narrow the range.` };
        }
        const rows = items.map((t) => {
            let payments = [];
            try {
                payments = JSON.parse(t.paymentsJson);
            }
            catch {
                /* ignore */
            }
            let lineItems = [];
            try {
                if (t.lineItemsSummaryJson)
                    lineItems = JSON.parse(t.lineItemsSummaryJson);
            }
            catch {
                /* ignore */
            }
            const primaryMethod = payments[0]?.method ?? "CASH";
            return {
                Date: t.createdAt.toISOString().slice(0, 10),
                Time: t.createdAt.toISOString().slice(11, 19),
                "Receipt No.": t.transactionNo,
                Cashier: t.cashierName ?? "",
                Status: t.status,
                Source: t.source,
                "Service Type": t.serviceType,
                "Payment Method": primaryMethod,
                Subtotal: (t.subtotalCents / 100).toFixed(2),
                Discount: (t.discountCents / 100).toFixed(2),
                Total: (t.totalCents / 100).toFixed(2),
                "Items Count": t.itemsCount,
                "Items Summary": lineItems.map((l) => `${l.name} x${l.qty}`).join("; ") || "",
            };
        });
        return { items: rows };
    });
    // Synced transactions list (for Cloud Admin)
    app.get("/transactions", async (req, reply) => {
        const storeId = req.query.storeId || "store_1";
        const from = req.query.from ? new Date(req.query.from + "T00:00:00.000Z") : null;
        const to = req.query.to ? new Date(req.query.to + "T23:59:59.999Z") : null;
        const limit = Math.min(parseInt(req.query.limit || "50", 10) || 50, 200);
        const cursor = req.query.cursor ? req.query.cursor : null;
        const where = { storeId };
        if (from || to) {
            where.createdAt = {};
            if (from)
                where.createdAt.gte = from;
            if (to)
                where.createdAt.lte = to;
        }
        const skip = cursor ? parseInt(cursor, 10) || 0 : 0;
        const items = await app.prisma.syncedTransaction.findMany({
            where,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip,
            take: limit + 1,
        });
        const hasMore = items.length > limit;
        const list = hasMore ? items.slice(0, limit) : items;
        const nextCursor = hasMore ? String(skip + limit) : null;
        const rows = list.map((t) => {
            let payments = [];
            try {
                payments = JSON.parse(t.paymentsJson);
            }
            catch {
                // ignore
            }
            let lineItems = [];
            try {
                if (t.lineItemsSummaryJson)
                    lineItems = JSON.parse(t.lineItemsSummaryJson);
            }
            catch {
                // ignore
            }
            return {
                id: t.id,
                sourceTransactionId: t.sourceTransactionId,
                transactionNo: t.transactionNo,
                status: t.status,
                source: t.source,
                serviceType: t.serviceType,
                cashierName: t.cashierName,
                totalCents: t.totalCents,
                subtotalCents: t.subtotalCents,
                discountCents: t.discountCents,
                itemsCount: t.itemsCount,
                createdAt: t.createdAt.toISOString(),
                voidedAt: t.voidedAt?.toISOString() ?? null,
                voidReason: t.voidReason,
                payments,
                lineItems,
            };
        });
        return { items: rows, nextCursor, hasMore };
    });
    // Daily report
    app.get("/reports/daily", async (req, reply) => {
        const storeId = req.query.storeId || "store_1";
        const dateStr = req.query.date || new Date().toISOString().slice(0, 10);
        const start = new Date(dateStr + "T00:00:00.000Z");
        const end = new Date(dateStr + "T23:59:59.999Z");
        const txs = await app.prisma.syncedTransaction.findMany({
            where: { storeId, status: "PAID", createdAt: { gte: start, lte: end } },
        });
        let totalSales = 0;
        let totalDiscounts = 0;
        const byMethod = {};
        for (const t of txs) {
            totalSales += t.totalCents;
            totalDiscounts += t.discountCents;
            try {
                const payments = JSON.parse(t.paymentsJson);
                for (const p of payments) {
                    byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amountCents;
                }
            }
            catch {
                // ignore
            }
        }
        const itemsCount = txs.reduce((s, t) => s + t.itemsCount, 0);
        return {
            date: dateStr,
            storeId,
            transactionCount: txs.length,
            itemsCount,
            totalSales,
            totalDiscounts,
            byPaymentMethod: byMethod,
        };
    });
    // Monthly report
    app.get("/reports/monthly", async (req, reply) => {
        const storeId = req.query.storeId || "store_1";
        const year = parseInt(req.query.year || String(new Date().getFullYear()), 10);
        const month = parseInt(req.query.month || String(new Date().getMonth() + 1), 10);
        const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
        const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
        const txs = await app.prisma.syncedTransaction.findMany({
            where: { storeId, status: "PAID", createdAt: { gte: start, lte: end } },
        });
        let totalSales = 0;
        let totalDiscounts = 0;
        const byMethod = {};
        for (const t of txs) {
            totalSales += t.totalCents;
            totalDiscounts += t.discountCents;
            try {
                const payments = JSON.parse(t.paymentsJson);
                for (const p of payments) {
                    byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amountCents;
                }
            }
            catch {
                // ignore
            }
        }
        const itemsCount = txs.reduce((s, t) => s + t.itemsCount, 0);
        return {
            year,
            month,
            storeId,
            transactionCount: txs.length,
            itemsCount,
            totalSales,
            totalDiscounts,
            byPaymentMethod: byMethod,
        };
    });
}
