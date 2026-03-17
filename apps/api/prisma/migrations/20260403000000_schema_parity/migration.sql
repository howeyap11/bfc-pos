/*
  Schema parity: new tables + table redefines (Int->Boolean, drop Item.imagePath).
  Runs after 20260402 so CloudIngredient, CloudMenuItem, etc. exist.
  SQLite-safe: no DROP INDEX on sqlite_autoindex_* (indexes backing UNIQUE cannot be dropped).
*/
-- CreateTable
CREATE TABLE "MenuItemRecipeSize" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "menuItemId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "baseType" TEXT NOT NULL,
    "sizeCode" TEXT NOT NULL,
    "qtyPerItem" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MenuItemRecipeSize_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "InventoryUnit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MenuItemRecipeSize_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MenuItemRecipeSize_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuItemRecipeSize_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CloudMenuItemSizePrice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cloudId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "menuItemCloudId" TEXT NOT NULL,
    "baseType" TEXT NOT NULL,
    "sizeOptionCloudId" TEXT NOT NULL,
    "sizeCode" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CloudMenuItemSizePrice_menuItemCloudId_fkey" FOREIGN KEY ("menuItemCloudId") REFERENCES "CloudMenuItem" ("cloudId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CloudRecipeLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cloudId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "menuItemCloudId" TEXT NOT NULL,
    "ingredientCloudId" TEXT NOT NULL,
    "qtyPerItem" DECIMAL NOT NULL,
    "unitCode" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SyncState" (
    "branchId" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "catalogVersion" INTEGER NOT NULL DEFAULT 0,
    "lastSyncAt" DATETIME
);

-- RedefineTables (Int->Boolean, etc.)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CloudIngredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cloudId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "name" TEXT NOT NULL,
    "unitCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_CloudIngredient" ("cloudId", "createdAt", "deletedAt", "id", "imageUrl", "isActive", "name", "storeId", "unitCode", "updatedAt", "version") SELECT "cloudId", "createdAt", "deletedAt", "id", "imageUrl", "isActive", "name", "storeId", "unitCode", "updatedAt", "version" FROM "CloudIngredient";
DROP TABLE "CloudIngredient";
ALTER TABLE "new_CloudIngredient" RENAME TO "CloudIngredient";
CREATE UNIQUE INDEX "CloudIngredient_cloudId_key" ON "CloudIngredient"("cloudId");
CREATE INDEX "CloudIngredient_storeId_idx" ON "CloudIngredient"("storeId");
CREATE TABLE "new_CloudMenuItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cloudId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "imageUrl" TEXT,
    "categoryCloudId" TEXT,
    "subCategoryCloudId" TEXT,
    "version" INTEGER NOT NULL,
    "deletedAt" DATETIME,
    "isDrink" BOOLEAN NOT NULL DEFAULT false,
    "serveVessel" TEXT,
    "defaultSizeId" TEXT,
    "defaultSizeOptionCloudId" TEXT,
    "hasSizes" BOOLEAN NOT NULL DEFAULT false,
    "supportsShots" BOOLEAN NOT NULL DEFAULT false,
    "defaultShots" INTEGER,
    "defaultSubstituteCloudId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_CloudMenuItem" ("categoryCloudId", "cloudId", "createdAt", "defaultShots", "defaultSizeId", "defaultSizeOptionCloudId", "defaultSubstituteCloudId", "deletedAt", "id", "imageUrl", "isActive", "isDrink", "name", "priceCents", "serveVessel", "storeId", "subCategoryCloudId", "supportsShots", "updatedAt", "version") SELECT "categoryCloudId", "cloudId", "createdAt", "defaultShots", "defaultSizeId", "defaultSizeOptionCloudId", "defaultSubstituteCloudId", "deletedAt", "id", "imageUrl", "isActive", "isDrink", "name", "priceCents", "serveVessel", "storeId", "subCategoryCloudId", "supportsShots", "updatedAt", "version" FROM "CloudMenuItem";
DROP TABLE "CloudMenuItem";
ALTER TABLE "new_CloudMenuItem" RENAME TO "CloudMenuItem";
CREATE UNIQUE INDEX "CloudMenuItem_cloudId_key" ON "CloudMenuItem"("cloudId");
CREATE INDEX "CloudMenuItem_storeId_idx" ON "CloudMenuItem"("storeId");
CREATE TABLE "new_CloudMenuItemSize" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cloudId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "menuItemCloudId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "temp" TEXT NOT NULL DEFAULT 'ANY',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CloudMenuItemSize_menuItemCloudId_fkey" FOREIGN KEY ("menuItemCloudId") REFERENCES "CloudMenuItem" ("cloudId") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CloudMenuItemSize" ("cloudId", "createdAt", "id", "isActive", "label", "menuItemCloudId", "sortOrder", "storeId", "temp", "updatedAt") SELECT "cloudId", "createdAt", "id", "isActive", "label", "menuItemCloudId", "sortOrder", "storeId", "temp", "updatedAt" FROM "CloudMenuItemSize";
DROP TABLE "CloudMenuItemSize";
ALTER TABLE "new_CloudMenuItemSize" RENAME TO "CloudMenuItemSize";
CREATE UNIQUE INDEX "CloudMenuItemSize_cloudId_key" ON "CloudMenuItemSize"("cloudId");
CREATE INDEX "CloudMenuItemSize_storeId_idx" ON "CloudMenuItemSize"("storeId");
CREATE INDEX "CloudMenuItemSize_menuItemCloudId_idx" ON "CloudMenuItemSize"("menuItemCloudId");
CREATE TABLE "new_CloudMenuOptionGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cloudId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "name" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "multi" BOOLEAN NOT NULL DEFAULT false,
    "isSizeGroup" BOOLEAN NOT NULL DEFAULT false,
    "defaultOptionCloudId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_CloudMenuOptionGroup" ("cloudId", "createdAt", "defaultOptionCloudId", "id", "isSizeGroup", "multi", "name", "required", "storeId", "updatedAt") SELECT "cloudId", "createdAt", "defaultOptionCloudId", "id", "isSizeGroup", "multi", "name", "required", "storeId", "updatedAt" FROM "CloudMenuOptionGroup";
DROP TABLE "CloudMenuOptionGroup";
ALTER TABLE "new_CloudMenuOptionGroup" RENAME TO "CloudMenuOptionGroup";
CREATE UNIQUE INDEX "CloudMenuOptionGroup_cloudId_key" ON "CloudMenuOptionGroup"("cloudId");
CREATE INDEX "CloudMenuOptionGroup_storeId_idx" ON "CloudMenuOptionGroup"("storeId");
CREATE TABLE "new_CloudMenuSizeAvailability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cloudId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "sizeCloudId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "imageUrl" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CloudMenuSizeAvailability_sizeCloudId_fkey" FOREIGN KEY ("sizeCloudId") REFERENCES "CloudMenuSize" ("cloudId") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CloudMenuSizeAvailability" ("cloudId", "createdAt", "id", "imageUrl", "isEnabled", "mode", "sizeCloudId", "sortOrder", "storeId", "updatedAt") SELECT "cloudId", "createdAt", "id", "imageUrl", "isEnabled", "mode", "sizeCloudId", "sortOrder", "storeId", "updatedAt" FROM "CloudMenuSizeAvailability";
DROP TABLE "CloudMenuSizeAvailability";
ALTER TABLE "new_CloudMenuSizeAvailability" RENAME TO "CloudMenuSizeAvailability";
CREATE UNIQUE INDEX "CloudMenuSizeAvailability_cloudId_key" ON "CloudMenuSizeAvailability"("cloudId");
CREATE INDEX "CloudMenuSizeAvailability_storeId_idx" ON "CloudMenuSizeAvailability"("storeId");
CREATE INDEX "CloudMenuSizeAvailability_sizeCloudId_idx" ON "CloudMenuSizeAvailability"("sizeCloudId");
CREATE UNIQUE INDEX "CloudMenuSizeAvailability_storeId_sizeCloudId_mode_key" ON "CloudMenuSizeAvailability"("storeId", "sizeCloudId", "mode");
CREATE TABLE "new_CloudShotPricingRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cloudId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "name" TEXT NOT NULL DEFAULT 'Standard',
    "shotsPerBundle" INTEGER NOT NULL DEFAULT 2,
    "priceCentsPerBundle" INTEGER NOT NULL DEFAULT 4000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_CloudShotPricingRule" ("cloudId", "createdAt", "id", "isActive", "name", "priceCentsPerBundle", "shotsPerBundle", "sortOrder", "storeId", "updatedAt") SELECT "cloudId", "createdAt", "id", "isActive", "name", "priceCentsPerBundle", "shotsPerBundle", "sortOrder", "storeId", "updatedAt" FROM "CloudShotPricingRule";
DROP TABLE "CloudShotPricingRule";
ALTER TABLE "new_CloudShotPricingRule" RENAME TO "CloudShotPricingRule";
CREATE UNIQUE INDEX "CloudShotPricingRule_cloudId_key" ON "CloudShotPricingRule"("cloudId");
CREATE INDEX "CloudShotPricingRule_storeId_idx" ON "CloudShotPricingRule"("storeId");
CREATE TABLE "new_CloudStoreSetting" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT '1',
    "adminPinHash" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_CloudStoreSetting" ("adminPinHash", "id", "updatedAt") SELECT "adminPinHash", "id", "updatedAt" FROM "CloudStoreSetting";
DROP TABLE "CloudStoreSetting";
ALTER TABLE "new_CloudStoreSetting" RENAME TO "CloudStoreSetting";
CREATE TABLE "new_CloudSubstituteRecipeConsumption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "substituteCloudId" TEXT NOT NULL,
    "sizeCloudId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "ingredientCloudId" TEXT NOT NULL,
    "qtyPerItem" TEXT NOT NULL,
    "unitCode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CloudSubstituteRecipeConsumption_substituteCloudId_fkey" FOREIGN KEY ("substituteCloudId") REFERENCES "CloudSubstitute" ("cloudId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CloudSubstituteRecipeConsumption_sizeCloudId_fkey" FOREIGN KEY ("sizeCloudId") REFERENCES "CloudMenuSize" ("cloudId") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CloudSubstituteRecipeConsumption" ("createdAt", "id", "ingredientCloudId", "mode", "qtyPerItem", "sizeCloudId", "storeId", "substituteCloudId", "unitCode", "updatedAt") SELECT "createdAt", "id", "ingredientCloudId", "mode", "qtyPerItem", "sizeCloudId", "storeId", "substituteCloudId", "unitCode", "updatedAt" FROM "CloudSubstituteRecipeConsumption";
DROP TABLE "CloudSubstituteRecipeConsumption";
ALTER TABLE "new_CloudSubstituteRecipeConsumption" RENAME TO "CloudSubstituteRecipeConsumption";
CREATE INDEX "CloudSubstituteRecipeConsumption_storeId_idx" ON "CloudSubstituteRecipeConsumption"("storeId");
CREATE INDEX "CloudSubstituteRecipeConsumption_substituteCloudId_idx" ON "CloudSubstituteRecipeConsumption"("substituteCloudId");
CREATE INDEX "CloudSubstituteRecipeConsumption_sizeCloudId_idx" ON "CloudSubstituteRecipeConsumption"("sizeCloudId");
CREATE UNIQUE INDEX "CloudSubstituteRecipeConsumption_storeId_substituteCloudId_sizeCloudId_mode_key" ON "CloudSubstituteRecipeConsumption"("storeId", "substituteCloudId", "sizeCloudId", "mode");
CREATE TABLE "new_CloudTransactionType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cloudId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "priceDeltaCents" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_CloudTransactionType" ("cloudId", "code", "createdAt", "id", "isActive", "label", "priceDeltaCents", "sortOrder", "storeId", "updatedAt") SELECT "cloudId", "code", "createdAt", "id", "isActive", "label", "priceDeltaCents", "sortOrder", "storeId", "updatedAt" FROM "CloudTransactionType";
DROP TABLE "CloudTransactionType";
ALTER TABLE "new_CloudTransactionType" RENAME TO "CloudTransactionType";
CREATE UNIQUE INDEX "CloudTransactionType_cloudId_key" ON "CloudTransactionType"("cloudId");
CREATE INDEX "CloudTransactionType_storeId_idx" ON "CloudTransactionType"("storeId");
CREATE TABLE "new_Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "cloudId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "series" TEXT,
    "basePrice" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "foodpandaSurchargeCents" INTEGER NOT NULL DEFAULT 2000,
    "defaultMilk" TEXT NOT NULL DEFAULT 'FULL_CREAM',
    "supportsShots" BOOLEAN NOT NULL DEFAULT false,
    "isEspressoDrink" BOOLEAN NOT NULL DEFAULT false,
    "shotsPricingMode" TEXT,
    "defaultShots12oz" INTEGER NOT NULL DEFAULT 0,
    "defaultShots16oz" INTEGER NOT NULL DEFAULT 0,
    "shotsDefaultSource" TEXT NOT NULL DEFAULT 'MANUAL',
    "defaultEspressoShots" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT NOT NULL,
    CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Item_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Item" ("basePrice", "categoryId", "cloudId", "defaultEspressoShots", "defaultMilk", "defaultShots12oz", "defaultShots16oz", "description", "foodpandaSurchargeCents", "id", "isActive", "isEspressoDrink", "isHidden", "name", "series", "shotsDefaultSource", "shotsPricingMode", "sort", "storeId", "supportsShots") SELECT "basePrice", "categoryId", "cloudId", "defaultEspressoShots", "defaultMilk", "defaultShots12oz", "defaultShots16oz", "description", "foodpandaSurchargeCents", "id", "isActive", "isEspressoDrink", "isHidden", "name", "series", "shotsDefaultSource", "shotsPricingMode", "sort", "storeId", "supportsShots" FROM "Item";
DROP TABLE "Item";
ALTER TABLE "new_Item" RENAME TO "Item";
CREATE UNIQUE INDEX "Item_cloudId_key" ON "Item"("cloudId");
CREATE INDEX "Item_storeId_idx" ON "Item"("storeId");
CREATE INDEX "Item_categoryId_idx" ON "Item"("categoryId");
CREATE UNIQUE INDEX "Item_categoryId_name_key" ON "Item"("categoryId", "name");
CREATE TABLE "new_Staff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "cloudId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "passcode" TEXT NOT NULL DEFAULT '1000',
    "key" TEXT,
    "role" TEXT NOT NULL DEFAULT 'BARISTA',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Staff_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Staff" ("cloudId", "createdAt", "email", "id", "isActive", "key", "name", "passcode", "role", "storeId", "updatedAt") SELECT "cloudId", "createdAt", "email", "id", "isActive", "key", "name", "passcode", "role", "storeId", "updatedAt" FROM "Staff";
DROP TABLE "Staff";
ALTER TABLE "new_Staff" RENAME TO "Staff";
CREATE UNIQUE INDEX "Staff_cloudId_key" ON "Staff"("cloudId");
CREATE UNIQUE INDEX "Staff_key_key" ON "Staff"("key");
CREATE UNIQUE INDEX "Staff_storeId_name_key" ON "Staff"("storeId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

CREATE INDEX "MenuItemRecipeSize_storeId_idx" ON "MenuItemRecipeSize"("storeId");
CREATE INDEX "MenuItemRecipeSize_menuItemId_idx" ON "MenuItemRecipeSize"("menuItemId");
CREATE INDEX "MenuItemRecipeSize_ingredientId_idx" ON "MenuItemRecipeSize"("ingredientId");
CREATE UNIQUE INDEX "MenuItemRecipeSize_storeId_menuItemId_ingredientId_baseType_sizeCode_key" ON "MenuItemRecipeSize"("storeId", "menuItemId", "ingredientId", "baseType", "sizeCode");

CREATE UNIQUE INDEX "CloudMenuItemSizePrice_cloudId_key" ON "CloudMenuItemSizePrice"("cloudId");
CREATE INDEX "CloudMenuItemSizePrice_storeId_idx" ON "CloudMenuItemSizePrice"("storeId");
CREATE INDEX "CloudMenuItemSizePrice_menuItemCloudId_idx" ON "CloudMenuItemSizePrice"("menuItemCloudId");
CREATE INDEX "CloudMenuItemSizePrice_sizeOptionCloudId_idx" ON "CloudMenuItemSizePrice"("sizeOptionCloudId");
CREATE UNIQUE INDEX "CloudMenuItemSizePrice_storeId_menuItemCloudId_baseType_sizeOptionCloudId_key" ON "CloudMenuItemSizePrice"("storeId", "menuItemCloudId", "baseType", "sizeOptionCloudId");

CREATE UNIQUE INDEX "CloudRecipeLine_cloudId_key" ON "CloudRecipeLine"("cloudId");
CREATE INDEX "CloudRecipeLine_storeId_idx" ON "CloudRecipeLine"("storeId");
CREATE INDEX "CloudRecipeLine_menuItemCloudId_idx" ON "CloudRecipeLine"("menuItemCloudId");
CREATE INDEX "CloudRecipeLine_ingredientCloudId_idx" ON "CloudRecipeLine"("ingredientCloudId");
