-- CreateTable SubstituteRecipeConsumption: global recipe consumption per substitute × size × mode (ml)
CREATE TABLE "SubstituteRecipeConsumption" (
    "id" TEXT NOT NULL,
    "substituteId" TEXT NOT NULL,
    "sizeId" TEXT NOT NULL,
    "mode" "DrinkMode" NOT NULL,
    "qtyMl" DECIMAL(20,10) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubstituteRecipeConsumption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubstituteRecipeConsumption_substituteId_sizeId_mode_key" ON "SubstituteRecipeConsumption"("substituteId", "sizeId", "mode");
CREATE INDEX "SubstituteRecipeConsumption_substituteId_idx" ON "SubstituteRecipeConsumption"("substituteId");
CREATE INDEX "SubstituteRecipeConsumption_sizeId_idx" ON "SubstituteRecipeConsumption"("sizeId");

ALTER TABLE "SubstituteRecipeConsumption" ADD CONSTRAINT "SubstituteRecipeConsumption_substituteId_fkey" FOREIGN KEY ("substituteId") REFERENCES "Substitute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubstituteRecipeConsumption" ADD CONSTRAINT "SubstituteRecipeConsumption_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "MenuSize"("id") ON DELETE CASCADE ON UPDATE CASCADE;
