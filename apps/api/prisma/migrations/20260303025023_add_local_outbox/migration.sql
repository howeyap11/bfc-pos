-- CreateTable
CREATE TABLE "LocalOutbox" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "topic" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LocalOutbox_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LocalOutbox_storeId_idx" ON "LocalOutbox"("storeId");

-- CreateIndex
CREATE INDEX "LocalOutbox_status_idx" ON "LocalOutbox"("status");

-- CreateIndex
CREATE INDEX "LocalOutbox_storeId_status_idx" ON "LocalOutbox"("storeId", "status");
