-- Add refund fields to SyncedTransaction for POS refund sync
ALTER TABLE "SyncedTransaction" ADD COLUMN "refundAmountCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SyncedTransaction" ADD COLUMN "refundsJson" TEXT;
