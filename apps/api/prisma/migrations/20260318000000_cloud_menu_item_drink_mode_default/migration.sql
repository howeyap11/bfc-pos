-- Per-mode default size option (mirrors cloud MenuItemDrinkModeDefault) for POS item-open resolution
CREATE TABLE "CloudMenuItemDrinkModeDefault" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "menuItemCloudId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "defaultOptionCloudId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "CloudMenuItemDrinkModeDefault_storeId_menuItemCloudId_mode_key" ON "CloudMenuItemDrinkModeDefault"("storeId", "menuItemCloudId", "mode");
CREATE INDEX "CloudMenuItemDrinkModeDefault_storeId_menuItemCloudId_idx" ON "CloudMenuItemDrinkModeDefault"("storeId", "menuItemCloudId");
