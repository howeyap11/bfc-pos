-- CreateTable
CREATE TABLE "SyncedTransaction" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "sourceTransactionId" TEXT NOT NULL,
    "transactionNo" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'POS',
    "serviceType" TEXT NOT NULL DEFAULT 'DINE_IN',
    "cashierName" TEXT,
    "totalCents" INTEGER NOT NULL,
    "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "itemsCount" INTEGER NOT NULL DEFAULT 0,
    "paymentsJson" TEXT NOT NULL,
    "lineItemsSummaryJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,

    CONSTRAINT "SyncedTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SyncedTransaction_sourceTransactionId_key" ON "SyncedTransaction"("sourceTransactionId");
CREATE INDEX "SyncedTransaction_storeId_idx" ON "SyncedTransaction"("storeId");
CREATE INDEX "SyncedTransaction_storeId_createdAt_idx" ON "SyncedTransaction"("storeId", "createdAt");
