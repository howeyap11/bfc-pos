-- AlterTable
ALTER TABLE "MenuItemSubstitute" ADD COLUMN "priceCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MenuItemSubstitute" ADD COLUMN "recipeQtyMl" DECIMAL(20,10);
