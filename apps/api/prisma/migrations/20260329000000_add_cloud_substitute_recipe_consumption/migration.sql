-- CreateTable CloudSubstituteRecipeConsumption (SQLite: FKs inline; no ALTER TABLE ADD CONSTRAINT)
CREATE TABLE "CloudSubstituteRecipeConsumption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "substituteCloudId" TEXT NOT NULL,
    "sizeCloudId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "qtyMl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CloudSubstituteRecipeConsumption_substituteCloudId_fkey" FOREIGN KEY ("substituteCloudId") REFERENCES "CloudSubstitute"("cloudId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CloudSubstituteRecipeConsumption_sizeCloudId_fkey" FOREIGN KEY ("sizeCloudId") REFERENCES "CloudMenuSize"("cloudId") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CloudSubstituteRecipeConsumption_storeId_substituteCloudId_sizeCloudId_mode_key" ON "CloudSubstituteRecipeConsumption"("storeId", "substituteCloudId", "sizeCloudId", "mode");
CREATE INDEX "CloudSubstituteRecipeConsumption_storeId_idx" ON "CloudSubstituteRecipeConsumption"("storeId");
CREATE INDEX "CloudSubstituteRecipeConsumption_substituteCloudId_idx" ON "CloudSubstituteRecipeConsumption"("substituteCloudId");
CREATE INDEX "CloudSubstituteRecipeConsumption_sizeCloudId_idx" ON "CloudSubstituteRecipeConsumption"("sizeCloudId");
