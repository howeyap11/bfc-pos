-- DropIndex
DROP INDEX IF EXISTS "Staff_email_idx";

-- AlterTable
ALTER TABLE "MenuItemSizePrice" ADD COLUMN     "includedShots" INTEGER;

-- AlterTable
ALTER TABLE "Staff" ALTER COLUMN "role" SET DEFAULT 'BARISTA';

-- AlterTable
ALTER TABLE "StoreSetting" ALTER COLUMN "id" SET DEFAULT '1';

-- AlterTable
ALTER TABLE "SubstituteRecipeConsumption" ALTER COLUMN "qtyPerItem" DROP DEFAULT,
ALTER COLUMN "unitCode" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Ingredient_categoryId_sortOrder_idx" ON "Ingredient"("categoryId", "sortOrder");
