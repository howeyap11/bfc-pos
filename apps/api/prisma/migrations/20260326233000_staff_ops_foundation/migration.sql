-- Staff operations foundation (local-first)

CREATE TABLE "StaffAttendanceEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "storeId" TEXT NOT NULL DEFAULT 'store_1',
  "cloudId" TEXT,
  "staffCloudId" TEXT,
  "staffName" TEXT NOT NULL,
  "staffRole" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "happenedAt" DATETIME NOT NULL,
  "selfieLocalPath" TEXT,
  "selfieUploadedUrl" TEXT,
  "syncStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "syncedAt" DATETIME,
  "lastSyncError" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "StaffAttendanceEvent_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "StaffAttendanceEvent_cloudId_key" ON "StaffAttendanceEvent"("cloudId");
CREATE INDEX "StaffAttendanceEvent_storeId_happenedAt_idx" ON "StaffAttendanceEvent"("storeId", "happenedAt");
CREATE INDEX "StaffAttendanceEvent_storeId_staffCloudId_happenedAt_idx" ON "StaffAttendanceEvent"("storeId", "staffCloudId", "happenedAt");
CREATE INDEX "StaffAttendanceEvent_syncStatus_idx" ON "StaffAttendanceEvent"("syncStatus");

CREATE TABLE "WasteReport" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "storeId" TEXT NOT NULL DEFAULT 'store_1',
  "cloudId" TEXT,
  "staffCloudId" TEXT,
  "staffName" TEXT NOT NULL,
  "itemType" TEXT NOT NULL,
  "inventoryItemCloudId" TEXT,
  "inventoryItemName" TEXT NOT NULL,
  "quantity" TEXT NOT NULL,
  "unit" TEXT,
  "reason" TEXT NOT NULL,
  "notes" TEXT,
  "imageLocalPath" TEXT NOT NULL,
  "imageUploadedUrl" TEXT,
  "happenedAt" DATETIME NOT NULL,
  "syncStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "syncedAt" DATETIME,
  "lastSyncError" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "WasteReport_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WasteReport_cloudId_key" ON "WasteReport"("cloudId");
CREATE INDEX "WasteReport_storeId_happenedAt_idx" ON "WasteReport"("storeId", "happenedAt");
CREATE INDEX "WasteReport_storeId_staffCloudId_happenedAt_idx" ON "WasteReport"("storeId", "staffCloudId", "happenedAt");
CREATE INDEX "WasteReport_syncStatus_idx" ON "WasteReport"("syncStatus");

CREATE TABLE "StaffInventoryCountSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "storeId" TEXT NOT NULL DEFAULT 'store_1',
  "cloudId" TEXT,
  "submittedByStaffCloudId" TEXT,
  "submittedByStaffName" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "notes" TEXT,
  "countedAt" DATETIME NOT NULL,
  "syncStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "syncedAt" DATETIME,
  "lastSyncError" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "StaffInventoryCountSession_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "StaffInventoryCountSession_cloudId_key" ON "StaffInventoryCountSession"("cloudId");
CREATE INDEX "StaffInventoryCountSession_storeId_countedAt_idx" ON "StaffInventoryCountSession"("storeId", "countedAt");
CREATE INDEX "StaffInventoryCountSession_syncStatus_idx" ON "StaffInventoryCountSession"("syncStatus");

CREATE TABLE "StaffInventoryCountLine" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "inventoryItemCloudId" TEXT NOT NULL,
  "inventoryItemName" TEXT NOT NULL,
  "expectedQuantity" TEXT,
  "actualQuantity" TEXT NOT NULL,
  "varianceQuantity" TEXT,
  "unit" TEXT,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "StaffInventoryCountLine_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StaffInventoryCountSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "StaffInventoryCountLine_sessionId_idx" ON "StaffInventoryCountLine"("sessionId");

CREATE TABLE "SopChecklistTemplateLocal" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cloudId" TEXT,
  "shiftType" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "checklistJson" TEXT NOT NULL,
  "lastSyncedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "SopChecklistTemplateLocal_cloudId_key" ON "SopChecklistTemplateLocal"("cloudId");
CREATE INDEX "SopChecklistTemplateLocal_isActive_shiftType_idx" ON "SopChecklistTemplateLocal"("isActive", "shiftType");

CREATE TABLE "SopChecklistSubmission" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "storeId" TEXT NOT NULL DEFAULT 'store_1',
  "cloudId" TEXT,
  "templateCloudId" TEXT,
  "templateName" TEXT NOT NULL,
  "templateVersion" INTEGER NOT NULL,
  "shiftType" TEXT NOT NULL,
  "submittedByStaffCloudId" TEXT,
  "submittedByStaffName" TEXT NOT NULL,
  "assignedShiftId" TEXT,
  "checklistResultJson" TEXT NOT NULL,
  "notes" TEXT,
  "submittedAt" DATETIME NOT NULL,
  "syncStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "syncedAt" DATETIME,
  "lastSyncError" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "SopChecklistSubmission_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SopChecklistSubmission_cloudId_key" ON "SopChecklistSubmission"("cloudId");
CREATE INDEX "SopChecklistSubmission_storeId_submittedAt_idx" ON "SopChecklistSubmission"("storeId", "submittedAt");
CREATE INDEX "SopChecklistSubmission_syncStatus_idx" ON "SopChecklistSubmission"("syncStatus");

CREATE TABLE "StaffShiftLocal" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cloudId" TEXT,
  "storeId" TEXT NOT NULL DEFAULT 'store_1',
  "staffCloudId" TEXT NOT NULL,
  "staffName" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "shiftDate" DATETIME NOT NULL,
  "startTimeText" TEXT NOT NULL,
  "endTimeText" TEXT NOT NULL,
  "shiftType" TEXT NOT NULL,
  "assignedBy" TEXT,
  "status" TEXT NOT NULL,
  "lastSyncedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "StaffShiftLocal_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "StaffShiftLocal_cloudId_key" ON "StaffShiftLocal"("cloudId");
CREATE INDEX "StaffShiftLocal_storeId_shiftDate_idx" ON "StaffShiftLocal"("storeId", "shiftDate");
CREATE INDEX "StaffShiftLocal_staffCloudId_shiftDate_idx" ON "StaffShiftLocal"("staffCloudId", "shiftDate");

CREATE TABLE "StaffIncentiveLedgerLocal" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "cloudId" TEXT,
  "storeId" TEXT NOT NULL DEFAULT 'store_1',
  "staffCloudId" TEXT NOT NULL,
  "staffName" TEXT NOT NULL,
  "entryType" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "amount" TEXT NOT NULL,
  "referenceType" TEXT,
  "referenceCloudId" TEXT,
  "happenedAt" DATETIME NOT NULL,
  "lastSyncedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "StaffIncentiveLedgerLocal_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "StaffIncentiveLedgerLocal_cloudId_key" ON "StaffIncentiveLedgerLocal"("cloudId");
CREATE INDEX "StaffIncentiveLedgerLocal_storeId_staffCloudId_happenedAt_idx" ON "StaffIncentiveLedgerLocal"("storeId", "staffCloudId", "happenedAt");
