-- Sealed unit/box configuration for staff inventory counting
ALTER TABLE "Ingredient" ADD COLUMN "hasSealedUnits" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Ingredient" ADD COLUMN "hasSealedBoxes" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Ingredient" ADD COLUMN "sealedUnitAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Ingredient" ADD COLUMN "sealedBoxAmount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "SyncedInventoryCountLine" ADD COLUMN "openedAmount" TEXT;
ALTER TABLE "SyncedInventoryCountLine" ADD COLUMN "sealedUnitCount" TEXT;
ALTER TABLE "SyncedInventoryCountLine" ADD COLUMN "sealedBoxCount" TEXT;
ALTER TABLE "SyncedInventoryCountLine" ADD COLUMN "totalAmount" TEXT;
