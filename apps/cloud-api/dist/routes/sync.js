export async function syncRoutes(app) {
    app.get("/catalog", async (req, reply) => {
        const sinceVersion = parseInt(req.query.sinceVersion ?? "0", 10);
        if (!Number.isFinite(sinceVersion) || sinceVersion < 0) {
            reply.code(400);
            return { error: "INVALID_SINCE_VERSION" };
        }
        const [catalogVersion, items, ingredients, recipeLines, categories, subCategories, menuOptionGroups, menuOptions, menuOptionGroupSections, menuItemOptionGroups, menuItemSizes, menuSizes, menuItemSizePrices,] = await Promise.all([
            app.prisma.catalogVersion.findUnique({ where: { id: 1 } }),
            app.prisma.menuItem.findMany({
                where: { version: { gt: sinceVersion } },
                include: {
                    drinkSizeConfigs: { include: { option: true } },
                    drinkModeDefaults: { include: { option: true } },
                },
            }),
            app.prisma.ingredient.findMany({ where: { version: { gt: sinceVersion } } }),
            app.prisma.recipeLine.findMany({ where: { version: { gt: sinceVersion } } }),
            app.prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
            app.prisma.subCategory.findMany({ orderBy: { sortOrder: "asc" } }),
            app.prisma.menuOptionGroup.findMany(),
            app.prisma.menuOption.findMany({ orderBy: [{ groupId: "asc" }, { sortOrder: "asc" }] }),
            app.prisma.menuOptionGroupSection.findMany({ orderBy: [{ optionGroupId: "asc" }, { sortOrder: "asc" }] }),
            app.prisma.menuItemOptionGroup.findMany(),
            app.prisma.menuItemSize.findMany({ where: { isActive: true } }),
            app.prisma.menuSize.findMany({
                where: { isActive: true },
                orderBy: { sortOrder: "asc" },
            }),
            app.prisma.menuItemSizePrice.findMany(),
        ]);
        const latestVersion = catalogVersion?.latestVersion ?? 0;
        return {
            latestVersion,
            items: items.map((i) => ({
                ...i,
                deletedAt: i.deletedAt?.toISOString() ?? null,
                defaultSizeId: i.defaultSizeId,
                defaultSizeOptionId: i.defaultSizeOptionId,
                drinkSizeConfigs: i.drinkSizeConfigs?.map((c) => ({
                    id: c.id,
                    menuItemId: c.menuItemId,
                    mode: c.mode,
                    optionId: c.optionId,
                    isEnabled: c.isEnabled,
                    option: c.option ? { id: c.option.id, name: c.option.name } : undefined,
                })) ?? [],
                drinkModeDefaults: i.drinkModeDefaults?.map((d) => ({
                    id: d.id,
                    menuItemId: d.menuItemId,
                    mode: d.mode,
                    defaultOptionId: d.defaultOptionId,
                    option: d.option ? { id: d.option.id, name: d.option.name } : undefined,
                })) ?? [],
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
            menuOptionGroupSections,
            menuItemOptionGroups,
            menuItemSizes,
            menuSizes: menuSizes.map((s) => ({
                id: s.id,
                label: s.label,
                sortOrder: s.sortOrder,
            })),
            menuItemSizePrices: menuItemSizePrices.map((p) => ({
                id: p.id,
                menuItemId: p.menuItemId,
                baseType: p.baseType,
                sizeOptionId: p.sizeOptionId,
                sizeCode: p.sizeCode,
                priceCents: p.priceCents,
            })),
        };
    });
}
