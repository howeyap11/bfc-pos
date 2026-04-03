-- AlterTable
ALTER TABLE "Ingredient" ADD COLUMN "cloudIngredientCloudId" TEXT;
CREATE UNIQUE INDEX "Ingredient_cloudIngredientCloudId_key" ON "Ingredient"("cloudIngredientCloudId");

-- CreateTable
CREATE TABLE "IngredientWarehouseStock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "ingredientId" TEXT NOT NULL,
    "onHandQty" TEXT NOT NULL DEFAULT '0',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IngredientWarehouseStock_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IngredientWarehouseStock_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "IngredientWarehouseStock_ingredientId_key" ON "IngredientWarehouseStock"("ingredientId");
CREATE UNIQUE INDEX "IngredientWarehouseStock_storeId_ingredientId_key" ON "IngredientWarehouseStock"("storeId", "ingredientId");
CREATE INDEX "IngredientWarehouseStock_storeId_idx" ON "IngredientWarehouseStock"("storeId");

-- AlterTable
ALTER TABLE "TransactionLineItem" ADD COLUMN "consumptionPerUnitByIngredientJson" TEXT;

-- AlterTable
ALTER TABLE "StaffInventoryCountSession" ADD COLUMN "snapshotJson" TEXT;

-- CreateTable
CREATE TABLE "StaffStockMovementLocal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "movementKind" TEXT NOT NULL,
    "ingredientCloudId" TEXT NOT NULL,
    "quantityBase" TEXT NOT NULL,
    "notes" TEXT,
    "submittedByStaffCloudId" TEXT,
    "submittedByLocalStaffId" TEXT,
    "submittedByStaffName" TEXT NOT NULL,
    "happenedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "syncedAt" DATETIME,
    "lastSyncError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StaffStockMovementLocal_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "StaffStockMovementLocal_storeId_happenedAt_idx" ON "StaffStockMovementLocal"("storeId", "happenedAt");
CREATE INDEX "StaffStockMovementLocal_syncStatus_idx" ON "StaffStockMovementLocal"("syncStatus");

-- AlterTable CloudShotPricingRule
ALTER TABLE "CloudShotPricingRule" ADD COLUMN "extraShotIngredientCloudId" TEXT;
ALTER TABLE "CloudShotPricingRule" ADD COLUMN "qtyPerExtraShot" TEXT;

-- AlterTable CloudStoreSetting
ALTER TABLE "CloudStoreSetting" ADD COLUMN "workDayFromTimeLocal" TEXT NOT NULL DEFAULT '04:00';
ALTER TABLE "CloudStoreSetting" ADD COLUMN "workDayToTimeLocal" TEXT NOT NULL DEFAULT '04:00';

-- CloudOptionRecipeSourceKind + CloudOptionRecipeLine
CREATE TABLE "CloudOptionRecipeLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "sourceKind" TEXT NOT NULL,
    "entityCloudId" TEXT NOT NULL,
    "ingredientCloudId" TEXT NOT NULL,
    "qtyPerItem" TEXT NOT NULL,
    "unitCode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "CloudOptionRecipeLine_storeId_sourceKind_entityCloudId_ingredientCloudId_key" ON "CloudOptionRecipeLine"("storeId", "sourceKind", "entityCloudId", "ingredientCloudId");
CREATE INDEX "CloudOptionRecipeLine_storeId_entityCloudId_idx" ON "CloudOptionRecipeLine"("storeId", "entityCloudId");
CREATE INDEX "CloudOptionRecipeLine_storeId_idx" ON "CloudOptionRecipeLine"("storeId");
