-- Staff manual inventory: shift classification + business date (4am audit day) + optional local staff id.
ALTER TABLE "StaffInventoryCountSession" ADD COLUMN "submittedByLocalStaffId" TEXT;
ALTER TABLE "StaffInventoryCountSession" ADD COLUMN "shiftType" TEXT NOT NULL DEFAULT 'Beginning';
ALTER TABLE "StaffInventoryCountSession" ADD COLUMN "businessDate" TEXT NOT NULL DEFAULT '2000-01-01';
