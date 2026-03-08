import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { bumpCatalogVersion } from "../lib/catalogVersion.js";
const UPLOADS_ITEMS = join(process.cwd(), "uploads", "items");
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
    const menuItemCreateSchema = z.object({
        name: z.string().min(1),
        priceCents: z.number().int().min(0),
        isActive: z.boolean().optional().default(true),
        imageUrl: z.string().optional().nullable(),
        subCategoryId: z.string().min(1),
    });
    const menuItemUpdateSchema = z.object({
        name: z.string().min(1).optional(),
        priceCents: z.number().int().min(0).optional(),
        isActive: z.boolean().optional(),
        imageUrl: z.string().optional().nullable(),
        subCategoryId: z.string().min(1).optional(),
    }).partial();
    app.get("/items", async () => {
        return app.prisma.menuItem.findMany({
            where: { deletedAt: null },
            orderBy: [{ createdAt: "desc" }],
            include: {
                recipeLines: true,
                category: true,
                subCategory: true,
                optionGroupLinks: { include: { group: { include: { options: true } } } },
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
        const version = await bumpCatalogVersion(app.prisma);
        return app.prisma.menuItem.create({
            data: {
                name: parsed.data.name,
                priceCents: parsed.data.priceCents,
                isActive: parsed.data.isActive ?? true,
                imageUrl: parsed.data.imageUrl ?? null,
                subCategoryId: parsed.data.subCategoryId,
                categoryId: sub.categoryId,
                version,
            },
        });
    });
    app.get("/items/:id", async (req, reply) => {
        const { id } = req.params;
        const item = await app.prisma.menuItem.findUnique({
            where: { id },
            include: {
                recipeLines: true,
                category: true,
                subCategory: true,
                optionGroupLinks: { include: { group: { include: { options: true } } } },
            },
        });
        if (!item) {
            reply.code(404);
            return { error: "NOT_FOUND" };
        }
        return item;
    });
    // POST /admin/items/:id/image - multipart upload
    app.post("/items/:id/image", async (req, reply) => {
        const { id } = req.params;
        const item = await app.prisma.menuItem.findUnique({ where: { id } });
        if (!item) {
            reply.code(404);
            return { error: "NOT_FOUND" };
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
        const version = await bumpCatalogVersion(app.prisma);
        const updateData = { ...parsed.data, version };
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
    app.delete("/items/:id", async (req, reply) => {
        const { id } = req.params;
        const version = await bumpCatalogVersion(app.prisma);
        await app.prisma.menuItem.update({
            where: { id },
            data: { deletedAt: new Date(), version },
        });
        reply.code(204);
    });
    // Ingredient CRUD
    const ingredientCreateSchema = z.object({
        name: z.string().min(1),
        unitCode: z.string().min(1),
        isActive: z.boolean().optional().default(true),
    });
    const ingredientUpdateSchema = ingredientCreateSchema.partial();
    app.get("/ingredients", async () => {
        return app.prisma.ingredient.findMany({
            orderBy: { createdAt: "desc" },
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
    // PUT /admin/items/:id/recipe - replace recipe lines
    const recipeLineSchema = z.object({
        ingredientId: z.string(),
        qtyPerItem: z.number(),
        unitCode: z.string().min(1),
    });
    const putRecipeSchema = z.object({
        lines: z.array(recipeLineSchema),
    });
    app.get("/items/:id/recipe", async (req, reply) => {
        const { id } = req.params;
        const item = await app.prisma.menuItem.findUnique({ where: { id } });
        if (!item) {
            reply.code(404);
            return { error: "NOT_FOUND" };
        }
        const lines = await app.prisma.recipeLine.findMany({
            where: { menuItemId: id, deletedAt: null },
        });
        return { lines };
    });
    app.put("/items/:id/recipe", async (req, reply) => {
        const { id } = req.params;
        const parsed = putRecipeSchema.safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const item = await app.prisma.menuItem.findUnique({ where: { id } });
        if (!item) {
            reply.code(404);
            return { error: "NOT_FOUND" };
        }
        const version = await bumpCatalogVersion(app.prisma);
        // Soft-delete existing lines (for sync) then create new ones
        await app.prisma.recipeLine.updateMany({
            where: { menuItemId: id },
            data: { deletedAt: new Date(), version },
        });
        if (parsed.data.lines.length > 0) {
            await app.prisma.recipeLine.createMany({
                data: parsed.data.lines.map((l) => ({
                    menuItemId: id,
                    ingredientId: l.ingredientId,
                    qtyPerItem: l.qtyPerItem,
                    unitCode: l.unitCode,
                    version,
                })),
            });
        }
        const lines = await app.prisma.recipeLine.findMany({
            where: { menuItemId: id, deletedAt: null },
        });
        return { lines };
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
        reply.code(204);
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
        reply.code(204);
    });
    // Option groups
    app.get("/option-groups", async () => {
        return app.prisma.menuOptionGroup.findMany({
            include: { options: true },
            orderBy: { id: "asc" },
        });
    });
    app.post("/option-groups", async (req, reply) => {
        const parsed = z.object({ name: z.string().min(1), required: z.boolean().optional(), multi: z.boolean().optional() }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        return app.prisma.menuOptionGroup.create({
            data: { name: parsed.data.name, required: parsed.data.required ?? false, multi: parsed.data.multi ?? false },
        });
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
        reply.code(204);
    });
    // Link item to option groups: PUT /admin/items/:id/option-groups
    app.put("/items/:id/option-groups", async (req, reply) => {
        const { id } = req.params;
        const parsed = z.object({ groupIds: z.array(z.string()) }).safeParse(req.body);
        if (!parsed.success) {
            reply.code(400);
            return { error: "INVALID_BODY", details: parsed.error.flatten() };
        }
        const item = await app.prisma.menuItem.findUnique({ where: { id } });
        if (!item) {
            reply.code(404);
            return { error: "NOT_FOUND" };
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
            include: { group: { include: { options: true } } },
        });
        return { optionGroupLinks: links };
    });
}
