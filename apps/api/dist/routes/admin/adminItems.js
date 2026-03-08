import { z } from "zod";
import { createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import { join } from "path";
import { pipeline } from "stream/promises";
import { getStoreIdFromBranch, getBranchFromRequest } from "../../plugins/adminGuard";
const ALLOWED_EXT = ["jpg", "jpeg", "png", "gif", "webp"];
const UPLOADS_ITEMS = "uploads/items";
export const adminItemsRoutes = async (app) => {
    const preHandler = [app.requireAdmin];
    // GET /admin/items
    app.get("/admin/items", { preHandler }, async (req, reply) => {
        const storeId = getStoreIdFromBranch(getBranchFromRequest(req));
        const items = await app.prisma.item.findMany({
            where: { storeId },
            select: {
                id: true,
                name: true,
                description: true,
                basePrice: true,
                isActive: true,
                imagePath: true,
                categoryId: true,
                sort: true,
            },
            orderBy: [{ sort: "asc" }, { name: "asc" }],
        });
        return { items };
    });
    // POST /admin/items
    app.post("/admin/items", { preHandler }, async (req, reply) => {
        const storeId = getStoreIdFromBranch(getBranchFromRequest(req));
        const bodySchema = z.object({
            name: z.string().min(1),
            description: z.string().optional(),
            categoryId: z.string(),
            basePrice: z.number().int().min(0).default(0),
            isActive: z.boolean().default(true),
            series: z.string().optional(),
            sort: z.number().int().default(0),
        });
        try {
            const body = bodySchema.parse(req.body);
            const item = await app.prisma.item.create({
                data: { ...body, storeId },
            });
            return { item };
        }
        catch (e) {
            app.log.error(e, "Failed to create item");
            reply.code(400);
            return { error: e.message ?? "Invalid input" };
        }
    });
    // PATCH /admin/items/:id
    app.patch("/admin/items/:id", { preHandler }, async (req, reply) => {
        const storeId = getStoreIdFromBranch(getBranchFromRequest(req));
        const { id } = req.params;
        const bodySchema = z.object({
            name: z.string().min(1).optional(),
            description: z.string().optional(),
            categoryId: z.string().optional(),
            basePrice: z.number().int().min(0).optional(),
            isActive: z.boolean().optional(),
            series: z.string().optional(),
            imagePath: z.string().optional(),
            sort: z.number().int().optional(),
        });
        try {
            const body = bodySchema.parse(req.body);
            const existing = await app.prisma.item.findFirst({
                where: { id, storeId },
            });
            if (!existing) {
                reply.code(404);
                return { error: "Item not found" };
            }
            const item = await app.prisma.item.update({
                where: { id },
                data: body,
            });
            return { item };
        }
        catch (e) {
            app.log.error(e, "Failed to update item");
            reply.code(400);
            return { error: e.message ?? "Invalid input" };
        }
    });
    // POST /admin/items/:id/image
    app.post("/admin/items/:id/image", { preHandler }, async (req, reply) => {
        const storeId = getStoreIdFromBranch(getBranchFromRequest(req));
        const { id } = req.params;
        const item = await app.prisma.item.findFirst({
            where: { id, storeId },
        });
        if (!item) {
            reply.code(404);
            return { error: "Item not found" };
        }
        const data = await req.file();
        if (!data) {
            reply.code(400);
            return { error: "No file uploaded" };
        }
        const filename = data.filename || "image";
        const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
        if (!ALLOWED_EXT.includes(ext)) {
            reply.code(400);
            return { error: `Invalid file type. Allowed: ${ALLOWED_EXT.join(", ")}` };
        }
        const dir = join(process.cwd(), UPLOADS_ITEMS);
        await mkdir(dir, { recursive: true });
        const filepath = join(dir, `${id}.${ext}`);
        const writeStream = createWriteStream(filepath);
        await pipeline(data.file, writeStream);
        const imagePath = `/uploads/items/${id}.${ext}`;
        await app.prisma.item.update({
            where: { id },
            data: { imagePath },
        });
        return { imagePath };
    });
    // GET /admin/items/:id/recipe
    app.get("/admin/items/:id/recipe", { preHandler }, async (req, reply) => {
        const storeId = getStoreIdFromBranch(getBranchFromRequest(req));
        const { id } = req.params;
        const item = await app.prisma.item.findFirst({
            where: { id, storeId },
        });
        if (!item) {
            reply.code(404);
            return { error: "Item not found" };
        }
        const lines = await app.prisma.menuItemRecipe.findMany({
            where: { menuItemId: id, storeId },
            include: {
                ingredient: { select: { id: true, name: true, sku: true } },
                unit: { select: { id: true, code: true, name: true } },
            },
        });
        return { lines };
    });
    // PUT /admin/items/:id/recipe
    app.put("/admin/items/:id/recipe", { preHandler }, async (req, reply) => {
        const storeId = getStoreIdFromBranch(getBranchFromRequest(req));
        const { id } = req.params;
        const item = await app.prisma.item.findFirst({
            where: { id, storeId },
        });
        if (!item) {
            reply.code(404);
            return { error: "Item not found" };
        }
        const bodySchema = z.object({
            lines: z.array(z.object({
                ingredientId: z.string(),
                qtyPerItem: z.union([z.string(), z.number()]),
                unitId: z.string(),
            })),
        });
        try {
            const { lines } = bodySchema.parse(req.body);
            for (const line of lines) {
                const ing = await app.prisma.ingredient.findFirst({
                    where: { id: line.ingredientId, storeId },
                    include: { unit: true },
                });
                if (!ing) {
                    reply.code(400);
                    return { error: `Ingredient not found: ${line.ingredientId}` };
                }
                if (ing.unitId !== line.unitId) {
                    reply.code(400);
                    return {
                        error: `Unit mismatch for ingredient ${ing.name}: must use ${ing.unit.code}`,
                    };
                }
                const qty = String(line.qtyPerItem);
                if (qty === "" || isNaN(Number(qty)) || Number(qty) < 0) {
                    reply.code(400);
                    return { error: `Invalid qtyPerItem for ingredient ${ing.name}` };
                }
            }
            await app.prisma.menuItemRecipe.deleteMany({
                where: { menuItemId: id, storeId },
            });
            if (lines.length > 0) {
                const seen = new Set();
                for (const line of lines) {
                    if (seen.has(line.ingredientId)) {
                        reply.code(400);
                        return { error: `Duplicate ingredient: ${line.ingredientId}` };
                    }
                    seen.add(line.ingredientId);
                }
                await app.prisma.menuItemRecipe.createMany({
                    data: lines.map((l) => ({
                        storeId,
                        menuItemId: id,
                        ingredientId: l.ingredientId,
                        qtyPerItem: String(l.qtyPerItem),
                        unitId: l.unitId,
                    })),
                });
            }
            const updated = await app.prisma.menuItemRecipe.findMany({
                where: { menuItemId: id, storeId },
                include: {
                    ingredient: { select: { id: true, name: true } },
                    unit: { select: { id: true, code: true } },
                },
            });
            return { lines: updated };
        }
        catch (e) {
            app.log.error(e, "Failed to update recipe");
            reply.code(400);
            return { error: e.message ?? "Invalid input" };
        }
    });
};
