import { Prisma, type PrismaClient } from "@prisma/client";

const STORE_ID = "store_1";
const DEFAULT_CATEGORY_NAME = "Menu";

/**
 * Resolve POS line `itemId` to local `Item.id`.
 * Accepts (1) menu cloudId, (2) legacy local Item.id from `/items/:id` fallback, or (3) creates Item from CloudMenuItem.
 *
 * CloudMenuItem.cloudId is globally unique — resolve by cloudId alone. Do not require storeId to match STORE_ID
 * (rows with a mismatched storeId would otherwise never resolve while the menu can still list them).
 */
export async function ensureItemForCloudId(prisma: PrismaClient, idOrCloudId: string): Promise<string> {
  const raw = typeof idOrCloudId === "string" ? idOrCloudId.trim() : String(idOrCloudId ?? "").trim();
  if (!raw) throw new Error("CloudMenuItem not found: (empty itemId)");

  const byCloud = await prisma.item.findUnique({ where: { cloudId: raw }, select: { id: true } });
  if (byCloud) return byCloud.id;

  // Stable menu id from cloud sync (same value stored as CloudMenuItem.cloudId)
  let cloud = await prisma.cloudMenuItem.findUnique({
    where: { cloudId: raw },
  });
  // Some clients send CloudMenuItem.id (Prisma row id) instead of cloudId — accept both
  if (!cloud) {
    cloud = await prisma.cloudMenuItem.findUnique({
      where: { id: raw },
    });
  }
  if (!cloud) {
    // QR orders store OrderItem.itemId = local Item.id (see POST /orders). Do not require storeId:
    // items created under another storeId or legacy rows still must resolve for checkout.
    const legacyItem = await prisma.item.findUnique({
      where: { id: raw },
      select: { id: true },
    });
    if (legacyItem) return legacyItem.id;
    throw new Error(`CloudMenuItem not found: ${raw}`);
  }
  // Active or soft-deleted cloud row — materialize local Item for checkout / inventory

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

  try {
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
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const again = await prisma.item.findUnique({
        where: { cloudId: cloud.cloudId },
        select: { id: true },
      });
      if (again) return again.id;
    }
    throw e;
  }
}
