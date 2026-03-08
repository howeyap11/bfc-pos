import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { bumpCatalogVersion } from "../lib/catalogVersion.js";
import { getDrinkSizesOptionGroup, getDrinkSizesOptionIds } from "../lib/drinkSizes.js";
const UPLOADS_ITEMS = join(process.cwd(), "uploads", "items");
const UPLOADS_INGREDIENTS = join(process.cwd(), "uploads", "ingredients");
const UPLOADS_SIZES = join(process.cwd(), "uploads", "sizes");
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
        sortOrder: z.number().int().optional(),
        hasSizes: z.boolean().optional(),
        supportsShots: z.boolean().optional(),
        defaultShots: z.number().int().min(0).optional().nullable(),
    })
        .partial();
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
        await mkdir(UPLOADS_SIZES, { recursive: true });
        const ext = extFromMime(data.mimetype);
        const filename = `${randomBytes(12).toString("hex")}.${ext}`;
        const filepath = join(UPLOADS_SIZES, filename);
        await pipeline(data.file, createWriteStream(filepath));
        const imageUrl = `/uploads/sizes/${filename}`;
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
        await mkdir(UPLOADS_ITEMS, { recursive: true });
        const ext = extFromMime(data.mimetype);
        const filename = `${randomBytes(12).toString("hex")}.${ext}`;
        const filepath = join(UPLOADS_ITEMS, filename);
        await pipeline(data.file, createWriteStream(filepath));
        const imageUrl = `/uploads/items/${filename}`;
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
        const updateData = {
            ...parsed.data,
            defaultSizeOptionId: defaultSizeOptionId ?? null,
            version,
        };
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
        await mkdir(UPLOADS_INGREDIENTS, { recursive: true });
        const ext = extFromMime(data.mimetype);
        const filename = `${randomBytes(12).toString("hex")}.${ext}`;
        const filepath = join(UPLOADS_INGREDIENTS, filename);
        await pipeline(data.file, createWriteStream(filepath));
        const imageUrl = `/uploads/ingredients/${filename}`;
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
    app.get("/items/:id/recipe", async (req, reply) => {
        const { id } = req.params;
        const item = await app.prisma.menuItem.findUnique({ where: { id } });
        if (!item) {
            reply.code(404);
            return { error: "NOT_FOUND" };
        }
        const [lines, sizeLines] = await Promise.all([
            app.prisma.recipeLine.findMany({
                where: { menuItemId: id, deletedAt: null },
            }),
            app.prisma.recipeLineSize.findMany({
                where: { menuItemId: id, deletedAt: null },
            }),
        ]);
        return { lines, sizeLines };
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
        // Full replace: hard-delete all recipe rows for this item, then insert current payload.
        // (Soft-delete was causing unique constraint violations: old rows still hold the composite key.)
        const runReplace = async () => {
            await app.prisma.$transaction(async (tx) => {
                await tx.recipeLine.deleteMany({ where: { menuItemId } });
                await tx.recipeLineSize.deleteMany({ where: { menuItemId } });
                if (item.hasSizes) {
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
        const [lines, sizeLines] = await Promise.all([
            app.prisma.recipeLine.findMany({
                where: { menuItemId, deletedAt: null },
            }),
            app.prisma.recipeLineSize.findMany({
                where: { menuItemId, deletedAt: null },
            }),
        ]);
        return { lines, sizeLines };
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
            reply.code(409);
            return { error: "CATEGORY_NOT_EMPTY", message: "Cannot delete: category has subcategories" };
        }
        await app.prisma.category.update({ where: { id }, data: { deletedAt: new Date() } });
        return { ok: true };
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
    // Option groups
    app.get("/option-groups", async () => {
        return app.prisma.menuOptionGroup.findMany({
            include: {
                options: { orderBy: { sortOrder: "asc" } },
                sections: { orderBy: { sortOrder: "asc" } },
                defaultOption: true,
            },
            orderBy: { id: "asc" },
        });
    });
    app.post("/option-groups", async (req, reply) => {
        const parsed = z.object({ name: z.string().min(1), required: z.boolean().optional(), multi: z.boolean().optional(), isSizeGroup: z.boolean().optional() }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        return app.prisma.menuOptionGroup.create({
            data: { name: parsed.data.name, required: parsed.data.required ?? false, multi: parsed.data.multi ?? false, isSizeGroup: parsed.data.isSizeGroup ?? false },
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
}
