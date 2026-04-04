ALTER TABLE "Ingredient" ADD COLUMN "hasSealedUnits" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Ingredient" ADD COLUMN "hasSealedBoxes" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Ingredient" ADD COLUMN "sealedUnitAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Ingredient" ADD COLUMN "sealedBoxAmount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "CloudIngredient" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CloudIngredient" ADD COLUMN "hasSealedUnits" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CloudIngredient" ADD COLUMN "hasSealedBoxes" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CloudIngredient" ADD COLUMN "sealedUnitAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CloudIngredient" ADD COLUMN "sealedBoxAmount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "CloudIngredient_storeId_sortOrder_idx" ON "CloudIngredient"("storeId", "sortOrder");

ALTER TABLE "StaffInventoryCountLine" ADD COLUMN "localIngredientId" TEXT;
ALTER TABLE "StaffInventoryCountLine" ADD COLUMN "openedAmount" TEXT;
ALTER TABLE "StaffInventoryCountLine" ADD COLUMN "sealedUnitCount" TEXT;
ALTER TABLE "StaffInventoryCountLine" ADD COLUMN "sealedBoxCount" TEXT;
ALTER TABLE "StaffInventoryCountLine" ADD COLUMN "totalAmount" TEXT;
