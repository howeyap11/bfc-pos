-- Add defaultSubstituteCloudId to CloudMenuItem
ALTER TABLE "CloudMenuItem" ADD COLUMN "defaultSubstituteCloudId" TEXT;

-- CloudAddOn
CREATE TABLE "CloudAddOn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cloudId" TEXT NOT NULL UNIQUE,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE INDEX "CloudAddOn_storeId_idx" ON "CloudAddOn"("storeId");

-- CloudSubstitute
CREATE TABLE "CloudSubstitute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cloudId" TEXT NOT NULL UNIQUE,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE INDEX "CloudSubstitute_storeId_idx" ON "CloudSubstitute"("storeId");

-- CloudMenuItemAddOn
CREATE TABLE "CloudMenuItemAddOn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "menuItemCloudId" TEXT NOT NULL,
    "addOnCloudId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "CloudMenuItemAddOn_storeId_menuItemCloudId_addOnCloudId_key" ON "CloudMenuItemAddOn"("storeId", "menuItemCloudId", "addOnCloudId");
CREATE INDEX "CloudMenuItemAddOn_storeId_idx" ON "CloudMenuItemAddOn"("storeId");
CREATE INDEX "CloudMenuItemAddOn_menuItemCloudId_idx" ON "CloudMenuItemAddOn"("menuItemCloudId");
CREATE INDEX "CloudMenuItemAddOn_addOnCloudId_idx" ON "CloudMenuItemAddOn"("addOnCloudId");

-- CloudMenuItemSubstitute
CREATE TABLE "CloudMenuItemSubstitute" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "menuItemCloudId" TEXT NOT NULL,
    "substituteCloudId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "CloudMenuItemSubstitute_storeId_menuItemCloudId_substituteCloudId_key" ON "CloudMenuItemSubstitute"("storeId", "menuItemCloudId", "substituteCloudId");
CREATE INDEX "CloudMenuItemSubstitute_storeId_idx" ON "CloudMenuItemSubstitute"("storeId");
CREATE INDEX "CloudMenuItemSubstitute_menuItemCloudId_idx" ON "CloudMenuItemSubstitute"("menuItemCloudId");
CREATE INDEX "CloudMenuItemSubstitute_substituteCloudId_idx" ON "CloudMenuItemSubstitute"("substituteCloudId");
