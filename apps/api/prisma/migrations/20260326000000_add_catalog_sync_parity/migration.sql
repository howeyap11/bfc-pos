-- Add imageUrl to CloudIngredient
ALTER TABLE "CloudIngredient" ADD COLUMN "imageUrl" TEXT;

-- Add defaultOptionCloudId to CloudMenuOptionGroup
ALTER TABLE "CloudMenuOptionGroup" ADD COLUMN "defaultOptionCloudId" TEXT;

-- CloudMenuOptionGroupSection
CREATE TABLE "CloudMenuOptionGroupSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cloudId" TEXT NOT NULL UNIQUE,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "optionGroupCloudId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "CloudMenuOptionGroupSection_storeId_idx" ON "CloudMenuOptionGroupSection"("storeId");
CREATE INDEX "CloudMenuOptionGroupSection_optionGroupCloudId_idx" ON "CloudMenuOptionGroupSection"("optionGroupCloudId");

-- CloudMenuSize
CREATE TABLE "CloudMenuSize" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cloudId" TEXT NOT NULL UNIQUE,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "groupCloudId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "CloudMenuSize_storeId_idx" ON "CloudMenuSize"("storeId");
CREATE INDEX "CloudMenuSize_groupCloudId_idx" ON "CloudMenuSize"("groupCloudId");

-- CloudMenuSizeAvailability
CREATE TABLE "CloudMenuSizeAvailability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cloudId" TEXT NOT NULL UNIQUE,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "sizeCloudId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "imageUrl" TEXT,
    "isEnabled" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CloudMenuSizeAvailability_sizeCloudId_fkey" FOREIGN KEY ("sizeCloudId") REFERENCES "CloudMenuSize" ("cloudId") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CloudMenuSizeAvailability_storeId_sizeCloudId_mode_key" ON "CloudMenuSizeAvailability"("storeId", "sizeCloudId", "mode");
CREATE INDEX "CloudMenuSizeAvailability_storeId_idx" ON "CloudMenuSizeAvailability"("storeId");
CREATE INDEX "CloudMenuSizeAvailability_sizeCloudId_idx" ON "CloudMenuSizeAvailability"("sizeCloudId");

-- CloudTransactionType
CREATE TABLE "CloudTransactionType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cloudId" TEXT NOT NULL UNIQUE,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "priceDeltaCents" INTEGER NOT NULL DEFAULT 0,
    "isActive" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "CloudTransactionType_storeId_idx" ON "CloudTransactionType"("storeId");

-- CloudShotPricingRule
CREATE TABLE "CloudShotPricingRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cloudId" TEXT NOT NULL UNIQUE,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "name" TEXT NOT NULL DEFAULT 'Standard',
    "shotsPerBundle" INTEGER NOT NULL DEFAULT 2,
    "priceCentsPerBundle" INTEGER NOT NULL DEFAULT 4000,
    "isActive" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "CloudShotPricingRule_storeId_idx" ON "CloudShotPricingRule"("storeId");

-- CloudRecipeLineSize
CREATE TABLE "CloudRecipeLineSize" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cloudId" TEXT NOT NULL UNIQUE,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "menuItemCloudId" TEXT NOT NULL,
    "ingredientCloudId" TEXT NOT NULL,
    "baseType" TEXT NOT NULL,
    "sizeCode" TEXT NOT NULL,
    "qtyPerItem" DECIMAL NOT NULL,
    "unitCode" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "CloudRecipeLineSize_storeId_menuItemCloudId_ingredientCloudId_baseType_sizeCode_key" ON "CloudRecipeLineSize"("storeId", "menuItemCloudId", "ingredientCloudId", "baseType", "sizeCode");
CREATE INDEX "CloudRecipeLineSize_storeId_idx" ON "CloudRecipeLineSize"("storeId");
CREATE INDEX "CloudRecipeLineSize_menuItemCloudId_idx" ON "CloudRecipeLineSize"("menuItemCloudId");
CREATE INDEX "CloudRecipeLineSize_ingredientCloudId_idx" ON "CloudRecipeLineSize"("ingredientCloudId");
