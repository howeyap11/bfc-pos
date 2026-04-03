-- AlterTable
ALTER TABLE "ShotPricingRule" ADD COLUMN     "extraShotIngredientId" TEXT,
ADD COLUMN     "qtyPerExtraShot" DECIMAL(20,10);

-- CreateIndex
CREATE INDEX "ShotPricingRule_extraShotIngredientId_idx" ON "ShotPricingRule"("extraShotIngredientId");

-- AddForeignKey
ALTER TABLE "ShotPricingRule" ADD CONSTRAINT "ShotPricingRule_extraShotIngredientId_fkey" FOREIGN KEY ("extraShotIngredientId") REFERENCES "Ingredient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
