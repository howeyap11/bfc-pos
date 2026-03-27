CREATE TABLE "SyncedStaffAttendance" (
  "id" TEXT PRIMARY KEY,
  "sourceLocalId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "staffCloudId" TEXT,
  "staffName" TEXT NOT NULL,
  "staffRole" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "happenedAt" TIMESTAMP(3) NOT NULL,
  "selfieUrl" TEXT,
  "selfieStorageKey" TEXT,
  "selfieExpiresAt" TIMESTAMP(3),
  "selfiePurgedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "SyncedStaffAttendance_storeId_sourceLocalId_key" ON "SyncedStaffAttendance"("storeId", "sourceLocalId");
CREATE INDEX "SyncedStaffAttendance_storeId_happenedAt_idx" ON "SyncedStaffAttendance"("storeId", "happenedAt");

CREATE TABLE "SyncedWasteReport" (
  "id" TEXT PRIMARY KEY,
  "sourceLocalId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "staffCloudId" TEXT,
  "staffName" TEXT NOT NULL,
  "itemType" TEXT NOT NULL,
  "inventoryItemCloudId" TEXT,
  "inventoryItemName" TEXT NOT NULL,
  "quantity" TEXT NOT NULL,
  "unit" TEXT,
  "reason" TEXT NOT NULL,
  "notes" TEXT,
  "imageUrl" TEXT,
  "imageStorageKey" TEXT,
  "happenedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "SyncedWasteReport_storeId_sourceLocalId_key" ON "SyncedWasteReport"("storeId", "sourceLocalId");
CREATE INDEX "SyncedWasteReport_storeId_happenedAt_idx" ON "SyncedWasteReport"("storeId", "happenedAt");

CREATE TABLE "SyncedInventoryCountSession" (
  "id" TEXT PRIMARY KEY,
  "sourceLocalId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "submittedByStaffCloudId" TEXT,
  "submittedByStaffName" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "notes" TEXT,
  "countedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "SyncedInventoryCountSession_storeId_sourceLocalId_key" ON "SyncedInventoryCountSession"("storeId", "sourceLocalId");
CREATE INDEX "SyncedInventoryCountSession_storeId_countedAt_idx" ON "SyncedInventoryCountSession"("storeId", "countedAt");

CREATE TABLE "SyncedInventoryCountLine" (
  "id" TEXT PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "inventoryItemCloudId" TEXT NOT NULL,
  "inventoryItemName" TEXT NOT NULL,
  "expectedQuantity" TEXT,
  "actualQuantity" TEXT NOT NULL,
  "varianceQuantity" TEXT,
  "unit" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "SyncedInventoryCountLine_sessionId_idx" ON "SyncedInventoryCountLine"("sessionId");
ALTER TABLE "SyncedInventoryCountLine"
ADD CONSTRAINT "SyncedInventoryCountLine_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "SyncedInventoryCountSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SyncedSopChecklistSubmission" (
  "id" TEXT PRIMARY KEY,
  "sourceLocalId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "templateCloudId" TEXT,
  "templateName" TEXT NOT NULL,
  "templateVersion" INTEGER NOT NULL,
  "shiftType" TEXT NOT NULL,
  "submittedByStaffCloudId" TEXT,
  "submittedByStaffName" TEXT NOT NULL,
  "assignedShiftId" TEXT,
  "checklistResultJson" TEXT NOT NULL,
  "notes" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "SyncedSopChecklistSubmission_storeId_sourceLocalId_key" ON "SyncedSopChecklistSubmission"("storeId", "sourceLocalId");
CREATE INDEX "SyncedSopChecklistSubmission_storeId_submittedAt_idx" ON "SyncedSopChecklistSubmission"("storeId", "submittedAt");

CREATE TABLE "CloudStaffShiftAssignment" (
  "id" TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "staffCloudId" TEXT NOT NULL,
  "staffName" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "shiftDate" TIMESTAMP(3) NOT NULL,
  "startTimeText" TEXT NOT NULL,
  "endTimeText" TEXT NOT NULL,
  "shiftType" TEXT NOT NULL,
  "assignedBy" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "CloudStaffShiftAssignment_storeId_shiftDate_idx" ON "CloudStaffShiftAssignment"("storeId", "shiftDate");
CREATE INDEX "CloudStaffShiftAssignment_staffCloudId_shiftDate_idx" ON "CloudStaffShiftAssignment"("staffCloudId", "shiftDate");

CREATE TABLE "CloudStaffIncentiveLedger" (
  "id" TEXT PRIMARY KEY,
  "storeId" TEXT NOT NULL,
  "staffCloudId" TEXT NOT NULL,
  "staffName" TEXT NOT NULL,
  "entryType" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "amount" TEXT NOT NULL,
  "referenceType" TEXT,
  "referenceCloudId" TEXT,
  "happenedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "CloudStaffIncentiveLedger_storeId_staffCloudId_happenedAt_idx" ON "CloudStaffIncentiveLedger"("storeId", "staffCloudId", "happenedAt");
