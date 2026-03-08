-- Add optional category fields to CloudMenuItem
ALTER TABLE "CloudMenuItem" ADD COLUMN "categoryCloudId" TEXT;
ALTER TABLE "CloudMenuItem" ADD COLUMN "subCategoryCloudId" TEXT;

-- CloudCategory
CREATE TABLE "CloudCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cloudId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "CloudCategory_cloudId_key" ON "CloudCategory"("cloudId");
CREATE INDEX "CloudCategory_storeId_idx" ON "CloudCategory"("storeId");

-- CloudSubCategory
CREATE TABLE "CloudSubCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cloudId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "name" TEXT NOT NULL,
    "categoryCloudId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "CloudSubCategory_cloudId_key" ON "CloudSubCategory"("cloudId");
CREATE INDEX "CloudSubCategory_storeId_idx" ON "CloudSubCategory"("storeId");
CREATE INDEX "CloudSubCategory_categoryCloudId_idx" ON "CloudSubCategory"("categoryCloudId");

-- CloudMenuOptionGroup
CREATE TABLE "CloudMenuOptionGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cloudId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "name" TEXT NOT NULL,
    "required" INTEGER NOT NULL DEFAULT 0,
    "multi" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "CloudMenuOptionGroup_cloudId_key" ON "CloudMenuOptionGroup"("cloudId");
CREATE INDEX "CloudMenuOptionGroup_storeId_idx" ON "CloudMenuOptionGroup"("storeId");

-- CloudMenuOption
CREATE TABLE "CloudMenuOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cloudId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "name" TEXT NOT NULL,
    "priceDelta" INTEGER NOT NULL DEFAULT 0,
    "groupCloudId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "CloudMenuOption_cloudId_key" ON "CloudMenuOption"("cloudId");
CREATE INDEX "CloudMenuOption_storeId_idx" ON "CloudMenuOption"("storeId");
CREATE INDEX "CloudMenuOption_groupCloudId_idx" ON "CloudMenuOption"("groupCloudId");

-- CloudMenuItemOptionGroup
CREATE TABLE "CloudMenuItemOptionGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "menuItemCloudId" TEXT NOT NULL,
    "groupCloudId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "CloudMenuItemOptionGroup_storeId_menuItemCloudId_groupCloudId_key" ON "CloudMenuItemOptionGroup"("storeId", "menuItemCloudId", "groupCloudId");
CREATE INDEX "CloudMenuItemOptionGroup_storeId_idx" ON "CloudMenuItemOptionGroup"("storeId");
CREATE INDEX "CloudMenuItemOptionGroup_menuItemCloudId_idx" ON "CloudMenuItemOptionGroup"("menuItemCloudId");
CREATE INDEX "CloudMenuItemOptionGroup_groupCloudId_idx" ON "CloudMenuItemOptionGroup"("groupCloudId");
