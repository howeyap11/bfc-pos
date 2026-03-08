-- CreateTable
CREATE TABLE "CloudMenuItemDrinkSizeConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "menuItemCloudId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "optionCloudId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CloudMenuItemDrinkSizeConfig_storeId_menuItemCloudId_mode_optionCloudId_key" ON "CloudMenuItemDrinkSizeConfig"("storeId", "menuItemCloudId", "mode", "optionCloudId");

-- CreateIndex
CREATE INDEX "CloudMenuItemDrinkSizeConfig_storeId_idx" ON "CloudMenuItemDrinkSizeConfig"("storeId");

-- CreateIndex
CREATE INDEX "CloudMenuItemDrinkSizeConfig_menuItemCloudId_idx" ON "CloudMenuItemDrinkSizeConfig"("menuItemCloudId");
