import type { PrismaClient } from "@prisma/client";

const STORE_ID = "store_1";
const DEFAULT_CATEGORY_NAME = "Menu";

/**
 * Resolve cloudId to Item.id. Creates Item from CloudMenuItem if needed.
 * Used when creating transactions - keeps TransactionLineItem.itemId and inventory (MenuItemRecipe) working.
 */
export async function ensureItemForCloudId(prisma: PrismaClient, cloudId: string): Promise<string> {
  const byCloud = await prisma.item.findUnique({ where: { cloudId }, select: { id: true } });
  if (byCloud) return byCloud.id;

  const cloud = await prisma.cloudMenuItem.findUnique({
    where: { cloudId, storeId: STORE_ID, deletedAt: null },
  });
  if (!cloud) throw new Error(`CloudMenuItem not found: ${cloudId}`);

  let category = await prisma.category.findFirst({ where: { storeId: STORE_ID } });
  if (!category) {
    category = await prisma.category.create({
      data: {
        storeId: STORE_ID,
        name: DEFAULT_CATEGORY_NAME,
        prepArea: "KITCHEN",
        sort: 0,
      },
    });
  }

  const item = await prisma.item.create({
    data: {
      storeId: STORE_ID,
      cloudId: cloud.cloudId,
      categoryId: category.id,
      name: cloud.name,
      basePrice: cloud.priceCents,
      isActive: cloud.isActive,
    },
  });
  return item.id;
}
