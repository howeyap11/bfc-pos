-- AlterTable
ALTER TABLE "SyncedTransaction" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "SyncedTransaction_isTest_idx" ON "SyncedTransaction"("isTest");
