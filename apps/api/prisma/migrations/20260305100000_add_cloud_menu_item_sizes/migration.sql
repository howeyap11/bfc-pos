-- Add defaultSizeId to CloudMenuItem
ALTER TABLE "CloudMenuItem" ADD COLUMN "defaultSizeId" TEXT;

-- Drop deprecated defaultSizeOptionCloudId (SQLite 3.35+)
-- If using older SQLite, comment out and migrate data manually
ALTER TABLE "CloudMenuItem" DROP COLUMN "defaultSizeOptionCloudId";

-- CloudMenuItemSize
CREATE TABLE "CloudMenuItemSize" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cloudId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "menuItemCloudId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "temp" TEXT NOT NULL DEFAULT 'ANY',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CloudMenuItemSize_menuItemCloudId_fkey" FOREIGN KEY ("menuItemCloudId") REFERENCES "CloudMenuItem" ("cloudId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CloudMenuItemSize_cloudId_key" ON "CloudMenuItemSize"("cloudId");
CREATE INDEX "CloudMenuItemSize_storeId_idx" ON "CloudMenuItemSize"("storeId");
CREATE INDEX "CloudMenuItemSize_menuItemCloudId_idx" ON "CloudMenuItemSize"("menuItemCloudId");
