-- AlterTable
ALTER TABLE "StoreConfig" ADD COLUMN "snapResiboEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StoreConfig" ADD COLUMN "snapResiboPriceCents" INTEGER;
ALTER TABLE "StoreConfig" ADD COLUMN "snapResiboRewardMinimumCents" INTEGER;

-- CreateTable
CREATE TABLE "SnapResiboVoucher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "voucherId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "source" TEXT,
    "transactionId" TEXT,
    "receiptNo" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedAt" DATETIME,
    "usedAt" DATETIME,
    CONSTRAINT "SnapResiboVoucher_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SnapResiboVoucher_storeId_voucherId_key" ON "SnapResiboVoucher"("storeId", "voucherId");
CREATE INDEX "SnapResiboVoucher_storeId_idx" ON "SnapResiboVoucher"("storeId");
CREATE INDEX "SnapResiboVoucher_storeId_status_idx" ON "SnapResiboVoucher"("storeId", "status");
