-- CreateTable CloudSubstitutePrice (SQLite: FKs inline; no ALTER TABLE ADD CONSTRAINT)
CREATE TABLE "CloudSubstitutePrice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "substituteCloudId" TEXT NOT NULL,
    "sizeCloudId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CloudSubstitutePrice_substituteCloudId_fkey" FOREIGN KEY ("substituteCloudId") REFERENCES "CloudSubstitute"("cloudId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CloudSubstitutePrice_sizeCloudId_fkey" FOREIGN KEY ("sizeCloudId") REFERENCES "CloudMenuSize"("cloudId") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CloudSubstitutePrice_storeId_substituteCloudId_sizeCloudId_mode_key" ON "CloudSubstitutePrice"("storeId", "substituteCloudId", "sizeCloudId", "mode");
CREATE INDEX "CloudSubstitutePrice_storeId_idx" ON "CloudSubstitutePrice"("storeId");
CREATE INDEX "CloudSubstitutePrice_substituteCloudId_idx" ON "CloudSubstitutePrice"("substituteCloudId");
CREATE INDEX "CloudSubstitutePrice_sizeCloudId_idx" ON "CloudSubstitutePrice"("sizeCloudId");
