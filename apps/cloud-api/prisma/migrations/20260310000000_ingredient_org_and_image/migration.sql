-- Add organization and image support to Ingredient
ALTER TABLE "Ingredient" ADD COLUMN "categoryName" TEXT;
ALTER TABLE "Ingredient" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Ingredient" ADD COLUMN "imageUrl" TEXT;
