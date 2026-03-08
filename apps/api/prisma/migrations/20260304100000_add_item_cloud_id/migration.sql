-- AlterTable
ALTER TABLE "Item" ADD COLUMN "cloudId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Item_cloudId_key" ON "Item"("cloudId");
