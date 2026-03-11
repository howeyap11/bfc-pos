-- Remove legacy substitute data and make recipe matrix ingredient-aware
-- 1) SubstituteRecipeConsumption: add ingredientId, qtyPerItem, unitCode; drop qtyMl
ALTER TABLE "SubstituteRecipeConsumption" ADD COLUMN "ingredientId" TEXT;
ALTER TABLE "SubstituteRecipeConsumption" ADD COLUMN "qtyPerItem" DECIMAL(20,10) NOT NULL DEFAULT 0;
ALTER TABLE "SubstituteRecipeConsumption" ADD COLUMN "unitCode" TEXT NOT NULL DEFAULT 'ml';

-- Backfill from existing qtyMl and from SubstituteRecipeLine (one ingredient per substitute)
UPDATE "SubstituteRecipeConsumption" SET "qtyPerItem" = "qtyMl" WHERE "qtyMl" IS NOT NULL;
UPDATE "SubstituteRecipeConsumption" SET "ingredientId" = (
  SELECT "SubstituteRecipeLine"."ingredientId"
  FROM "SubstituteRecipeLine"
  WHERE "SubstituteRecipeLine"."substituteId" = "SubstituteRecipeConsumption"."substituteId"
  LIMIT 1
);

-- Set any remaining null ingredientId to first ingredient in DB (fallback for orphan rows)
UPDATE "SubstituteRecipeConsumption" SET "ingredientId" = (SELECT "id" FROM "Ingredient" LIMIT 1)
WHERE "ingredientId" IS NULL AND EXISTS (SELECT 1 FROM "Ingredient" LIMIT 1);

ALTER TABLE "SubstituteRecipeConsumption" ALTER COLUMN "ingredientId" SET NOT NULL;
ALTER TABLE "SubstituteRecipeConsumption" DROP COLUMN "qtyMl";

CREATE INDEX IF NOT EXISTS "SubstituteRecipeConsumption_ingredientId_idx" ON "SubstituteRecipeConsumption"("ingredientId");
ALTER TABLE "SubstituteRecipeConsumption" ADD CONSTRAINT "SubstituteRecipeConsumption_ingredientId_fkey"
  FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2) Drop legacy SubstituteRecipeLine
DROP TABLE IF EXISTS "SubstituteRecipeLine";

-- 3) MenuItemSubstitute: remove per-item price/recipe (use global matrix only)
ALTER TABLE "MenuItemSubstitute" DROP COLUMN "priceCents";
ALTER TABLE "MenuItemSubstitute" DROP COLUMN "recipeQtyMl";

-- 4) Substitute: remove legacy fallback price (use SubstitutePrice only)
ALTER TABLE "Substitute" DROP COLUMN "priceCents";
