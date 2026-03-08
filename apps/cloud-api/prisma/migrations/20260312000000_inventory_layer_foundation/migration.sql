-- CreateEnum
CREATE TYPE "InventoryDepartment" AS ENUM ('BAR', 'KITCHEN', 'PASTRY', 'SHARED');
CREATE TYPE "InventoryTrackingType" AS ENUM ('VOLATILE', 'EXACT', 'COUNT_ONLY');
CREATE TYPE "InventoryLocationType" AS ENUM ('WAREHOUSE', 'STORE', 'EVENT', 'POPUP');
CREATE TYPE "StockMovementType" AS ENUM ('OPENING', 'SALE_DEDUCTION', 'PURCHASE_ADD', 'WASTE', 'TRANSFER_OUT', 'TRANSFER_IN', 'RECONCILIATION_VARIANCE', 'MANUAL_ADJUSTMENT', 'REVERSAL');
CREATE TYPE "StockTransferStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');
CREATE TYPE "InventoryReconciliationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED');
CREATE TYPE "WasteReasonCode" AS ENUM ('SPILL', 'REMAKE', 'EXPIRED', 'DAMAGED', 'TESTING', 'OTHER');

-- CreateTable
CREATE TABLE "InventoryLocation" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locationType" "InventoryLocationType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryLocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryLocation_code_key" ON "InventoryLocation"("code");
CREATE INDEX "InventoryLocation_locationType_idx" ON "InventoryLocation"("locationType");

-- Seed default locations (MAIN_CAFE maps to legacy STORE, WAREHOUSE unchanged)
INSERT INTO "InventoryLocation" ("id", "code", "name", "locationType", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES
    ('loc_main_cafe', 'MAIN_CAFE', 'Main Cafe', 'STORE', true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('loc_warehouse', 'WAREHOUSE', 'Warehouse', 'WAREHOUSE', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable Ingredient: add inventory metadata
ALTER TABLE "Ingredient" ADD COLUMN "department" "InventoryDepartment";
ALTER TABLE "Ingredient" ADD COLUMN "trackingType" "InventoryTrackingType" DEFAULT 'EXACT';
ALTER TABLE "Ingredient" ADD COLUMN "quickCountUnitName" TEXT;
ALTER TABLE "Ingredient" ADD COLUMN "quickCountUnitToBase" DECIMAL(20,10);
ALTER TABLE "Ingredient" ADD COLUMN "warehouseUnitName" TEXT;
ALTER TABLE "Ingredient" ADD COLUMN "warehouseUnitToBase" DECIMAL(20,10);

CREATE INDEX "Ingredient_department_idx" ON "Ingredient"("department");
CREATE INDEX "Ingredient_trackingType_idx" ON "Ingredient"("trackingType");

-- AlterTable StockMovement: migrate locationType -> locationId, add new columns
ALTER TABLE "StockMovement" ADD COLUMN "locationId" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN "movementType" "StockMovementType";
ALTER TABLE "StockMovement" ADD COLUMN "actorStaffId" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN "approvedByStaffId" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN "notes" TEXT;
ALTER TABLE "StockMovement" ADD COLUMN "businessDate" TIMESTAMP(3);

-- Migrate: STORE -> MAIN_CAFE, WAREHOUSE -> WAREHOUSE
UPDATE "StockMovement" SET "locationId" = 'loc_main_cafe', "movementType" = 'MANUAL_ADJUSTMENT' WHERE "locationType" = 'STORE';
UPDATE "StockMovement" SET "locationId" = 'loc_warehouse', "movementType" = 'MANUAL_ADJUSTMENT' WHERE "locationType" = 'WAREHOUSE';

-- For any rows without locationId (e.g. null or unexpected value), default to MAIN_CAFE
UPDATE "StockMovement" SET "locationId" = 'loc_main_cafe', "movementType" = 'MANUAL_ADJUSTMENT' WHERE "locationId" IS NULL;

-- Drop old index, drop locationType, make locationId and movementType NOT NULL
DROP INDEX IF EXISTS "StockMovement_ingredientId_locationType_idx";
ALTER TABLE "StockMovement" DROP COLUMN "locationType";
ALTER TABLE "StockMovement" ALTER COLUMN "locationId" SET NOT NULL;
ALTER TABLE "StockMovement" ALTER COLUMN "movementType" SET NOT NULL;

ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "StockMovement_locationId_idx" ON "StockMovement"("locationId");
CREATE INDEX "StockMovement_ingredientId_locationId_idx" ON "StockMovement"("ingredientId", "locationId");
CREATE INDEX "StockMovement_sourceType_sourceId_idx" ON "StockMovement"("sourceType", "sourceId");

-- CreateTable StockTransfer
CREATE TABLE "StockTransfer" (
    "id" TEXT NOT NULL,
    "fromLocationId" TEXT NOT NULL,
    "toLocationId" TEXT NOT NULL,
    "submittedByStaffId" TEXT,
    "approvedByStaffId" TEXT,
    "status" "StockTransferStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockTransfer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StockTransfer_fromLocationId_idx" ON "StockTransfer"("fromLocationId");
CREATE INDEX "StockTransfer_toLocationId_idx" ON "StockTransfer"("toLocationId");
CREATE INDEX "StockTransfer_status_idx" ON "StockTransfer"("status");

ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable StockTransferLine
CREATE TABLE "StockTransferLine" (
    "id" TEXT NOT NULL,
    "stockTransferId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantityInput" DECIMAL(20,10) NOT NULL,
    "quantityBase" DECIMAL(20,10) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "StockTransferLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StockTransferLine_stockTransferId_idx" ON "StockTransferLine"("stockTransferId");
CREATE INDEX "StockTransferLine_ingredientId_idx" ON "StockTransferLine"("ingredientId");

ALTER TABLE "StockTransferLine" ADD CONSTRAINT "StockTransferLine_stockTransferId_fkey" FOREIGN KEY ("stockTransferId") REFERENCES "StockTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockTransferLine" ADD CONSTRAINT "StockTransferLine_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable InventoryReconciliation
CREATE TABLE "InventoryReconciliation" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "businessDate" TIMESTAMP(3) NOT NULL,
    "countedByStaffId" TEXT,
    "approvedByStaffId" TEXT,
    "status" "InventoryReconciliationStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryReconciliation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryReconciliation_locationId_businessDate_key" ON "InventoryReconciliation"("locationId", "businessDate");
CREATE INDEX "InventoryReconciliation_locationId_idx" ON "InventoryReconciliation"("locationId");
CREATE INDEX "InventoryReconciliation_businessDate_idx" ON "InventoryReconciliation"("businessDate");

ALTER TABLE "InventoryReconciliation" ADD CONSTRAINT "InventoryReconciliation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "InventoryLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable InventoryReconciliationLine
CREATE TABLE "InventoryReconciliationLine" (
    "id" TEXT NOT NULL,
    "reconciliationId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "theoreticalQtyBase" DECIMAL(20,10) NOT NULL,
    "actualQtyBase" DECIMAL(20,10) NOT NULL,
    "varianceQtyBase" DECIMAL(20,10) NOT NULL,
    "varianceReasonCode" TEXT,
    "notes" TEXT,

    CONSTRAINT "InventoryReconciliationLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryReconciliationLine_reconciliationId_ingredientId_key" ON "InventoryReconciliationLine"("reconciliationId", "ingredientId");
CREATE INDEX "InventoryReconciliationLine_reconciliationId_idx" ON "InventoryReconciliationLine"("reconciliationId");
CREATE INDEX "InventoryReconciliationLine_ingredientId_idx" ON "InventoryReconciliationLine"("ingredientId");

ALTER TABLE "InventoryReconciliationLine" ADD CONSTRAINT "InventoryReconciliationLine_reconciliationId_fkey" FOREIGN KEY ("reconciliationId") REFERENCES "InventoryReconciliation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryReconciliationLine" ADD CONSTRAINT "InventoryReconciliationLine_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
