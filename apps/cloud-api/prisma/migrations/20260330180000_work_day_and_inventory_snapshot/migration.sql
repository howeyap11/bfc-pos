-- Work log boundary + manual count snapshot / revision
ALTER TABLE "StoreSetting" ADD COLUMN IF NOT EXISTS "workDayFromTimeLocal" TEXT NOT NULL DEFAULT '04:00';
ALTER TABLE "StoreSetting" ADD COLUMN IF NOT EXISTS "workDayToTimeLocal" TEXT NOT NULL DEFAULT '04:00';

ALTER TABLE "SyncedInventoryCountSession" ADD COLUMN IF NOT EXISTS "snapshotJson" TEXT;
ALTER TABLE "SyncedInventoryCountSession" ADD COLUMN IF NOT EXISTS "revision" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS "SyncedInventoryCountSession_storeId_businessDate_shiftType_idx" ON "SyncedInventoryCountSession"("storeId", "businessDate", "shiftType");
