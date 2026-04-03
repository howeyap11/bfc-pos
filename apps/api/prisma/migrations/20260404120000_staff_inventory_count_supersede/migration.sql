-- Effective slot: at most one non-superseded session per storeId + businessDate + shiftType (enforced in app).
ALTER TABLE "StaffInventoryCountSession" ADD COLUMN "supersededAt" DATETIME;
ALTER TABLE "StaffInventoryCountSession" ADD COLUMN "supersededBySessionId" TEXT;
ALTER TABLE "StaffInventoryCountSession" ADD COLUMN "replacesSessionId" TEXT;

CREATE INDEX "StaffInventoryCountSession_storeId_businessDate_shiftType_idx"
  ON "StaffInventoryCountSession"("storeId", "businessDate", "shiftType");
