import { z } from "zod";
import { getStoreIdFromBranch, getBranchFromRequest } from "../../plugins/adminGuard";
export const adminIngredientsRoutes = async (app) => {
    const preHandler = [app.requireAdmin];
    // GET /admin/ingredients
    app.get("/admin/ingredients", { preHandler }, async (req, reply) => {
        const storeId = getStoreIdFromBranch(getBranchFromRequest(req));
        const ingredients = await app.prisma.ingredient.findMany({
            where: { storeId },
            include: {
                unit: { select: { id: true, code: true, name: true } },
                stock: { select: { onHandQty: true } },
            },
            orderBy: { name: "asc" },
        });
        return { ingredients };
    });
    // POST /admin/ingredients
    app.post("/admin/ingredients", { preHandler }, async (req, reply) => {
        const storeId = getStoreIdFromBranch(getBranchFromRequest(req));
        const bodySchema = z.object({
            name: z.string().min(1),
            sku: z.string().optional(),
            unitId: z.string(),
            reorderLevel: z.union([z.string(), z.number()]).optional(),
            isActive: z.boolean().default(true),
        });
        try {
            const body = bodySchema.parse(req.body);
            const ingredient = await app.prisma.ingredient.create({
                data: {
                    storeId,
                    name: body.name,
                    sku: body.sku ?? null,
                    unitId: body.unitId,
                    reorderLevel: body.reorderLevel != null ? String(body.reorderLevel) : null,
                    isActive: body.isActive,
                },
                include: { unit: true },
            });
            return { ingredient };
        }
        catch (e) {
            app.log.error(e, "Failed to create ingredient");
            reply.code(400);
            return { error: e.message ?? "Invalid input" };
        }
    });
    // PATCH /admin/ingredients/:id
    app.patch("/admin/ingredients/:id", { preHandler }, async (req, reply) => {
        const storeId = getStoreIdFromBranch(getBranchFromRequest(req));
        const { id } = req.params;
        const bodySchema = z.object({
            name: z.string().min(1).optional(),
            sku: z.string().optional(),
            unitId: z.string().optional(),
            reorderLevel: z.union([z.string(), z.number()]).optional(),
            isActive: z.boolean().optional(),
        });
        try {
            const body = bodySchema.parse(req.body);
            const existing = await app.prisma.ingredient.findFirst({
                where: { id, storeId },
            });
            if (!existing) {
                reply.code(404);
                return { error: "Ingredient not found" };
            }
            const data = { ...body };
            if (body.reorderLevel !== undefined) {
                data.reorderLevel = body.reorderLevel == null ? null : String(body.reorderLevel);
            }
            const ingredient = await app.prisma.ingredient.update({
                where: { id },
                data,
                include: { unit: true },
            });
            return { ingredient };
        }
        catch (e) {
            app.log.error(e, "Failed to update ingredient");
            reply.code(400);
            return { error: e.message ?? "Invalid input" };
        }
    });
};
