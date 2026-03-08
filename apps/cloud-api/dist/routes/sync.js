export async function syncRoutes(app) {
    app.get("/catalog", async (req, reply) => {
        const sinceVersion = parseInt(req.query.sinceVersion ?? "0", 10);
        if (!Number.isFinite(sinceVersion) || sinceVersion < 0) {
            reply.code(400);
            return { error: "INVALID_SINCE_VERSION" };
        }
        const [catalogVersion, items, ingredients, recipeLines, categories, subCategories, menuOptionGroups, menuOptions, menuItemOptionGroups,] = await Promise.all([
            app.prisma.catalogVersion.findUnique({ where: { id: 1 } }),
            app.prisma.menuItem.findMany({ where: { version: { gt: sinceVersion } } }),
            app.prisma.ingredient.findMany({ where: { version: { gt: sinceVersion } } }),
            app.prisma.recipeLine.findMany({ where: { version: { gt: sinceVersion } } }),
            app.prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
            app.prisma.subCategory.findMany({ orderBy: { sortOrder: "asc" } }),
            app.prisma.menuOptionGroup.findMany(),
            app.prisma.menuOption.findMany(),
            app.prisma.menuItemOptionGroup.findMany(),
        ]);
        const latestVersion = catalogVersion?.latestVersion ?? 0;
        return {
            latestVersion,
            items: items.map((i) => ({
                ...i,
                deletedAt: i.deletedAt?.toISOString() ?? null,
            })),
            ingredients: ingredients.map((i) => ({
                ...i,
                deletedAt: i.deletedAt?.toISOString() ?? null,
            })),
            recipeLines: recipeLines.map((r) => ({
                ...r,
                qtyPerItem: r.qtyPerItem.toString(),
                deletedAt: r.deletedAt?.toISOString() ?? null,
            })),
            categories: categories.map((c) => ({ ...c, deletedAt: c.deletedAt?.toISOString() ?? null })),
            subCategories: subCategories.map((s) => ({ ...s, deletedAt: s.deletedAt?.toISOString() ?? null })),
            menuOptionGroups,
            menuOptions,
            menuItemOptionGroups,
        };
    });
}
