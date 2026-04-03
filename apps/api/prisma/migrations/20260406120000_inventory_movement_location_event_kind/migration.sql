-- RedefineTables
ALTER TABLE "InventoryMovement" ADD COLUMN "locationCode" TEXT;
ALTER TABLE "InventoryMovement" ADD COLUMN "eventKind" TEXT;
CREATE INDEX "InventoryMovement_storeId_locationCode_idx" ON "InventoryMovement"("storeId", "locationCode");
