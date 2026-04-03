-- Cloud mirror of staff inventory session metadata for audit / Work Log.
ALTER TABLE "SyncedInventoryCountSession" ADD COLUMN "shiftType" TEXT;
ALTER TABLE "SyncedInventoryCountSession" ADD COLUMN "businessDate" TEXT;
ALTER TABLE "SyncedInventoryCountSession" ADD COLUMN "submittedByLocalStaffId" TEXT;

CREATE INDEX "SyncedInventoryCountSession_storeId_businessDate_idx" ON "SyncedInventoryCountSession"("storeId", "businessDate");
