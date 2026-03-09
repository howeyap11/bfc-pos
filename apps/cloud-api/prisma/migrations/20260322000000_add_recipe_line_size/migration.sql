-- CreateTable
CREATE TABLE "RecipeLineSize" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "baseType" "DrinkMode" NOT NULL,
    "sizeCode" TEXT NOT NULL,
    "qtyPerItem" DECIMAL(20,10) NOT NULL,
    "unitCode" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecipeLineSize_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RecipeLineSize_menuItemId_ingredientId_baseType_sizeCode_key" ON "RecipeLineSize"("menuItemId", "ingredientId", "baseType", "sizeCode");
CREATE INDEX "RecipeLineSize_menuItemId_idx" ON "RecipeLineSize"("menuItemId");
CREATE INDEX "RecipeLineSize_ingredientId_idx" ON "RecipeLineSize"("ingredientId");
CREATE INDEX "RecipeLineSize_version_idx" ON "RecipeLineSize"("version");

ALTER TABLE "RecipeLineSize" ADD CONSTRAINT "RecipeLineSize_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipeLineSize" ADD CONSTRAINT "RecipeLineSize_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
