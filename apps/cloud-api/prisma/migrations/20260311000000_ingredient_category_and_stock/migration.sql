-- Create IngredientCategory
CREATE TABLE "IngredientCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngredientCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IngredientCategory_name_key" ON "IngredientCategory"("name");

-- Add categoryId to Ingredient (nullable)
ALTER TABLE "Ingredient" ADD COLUMN "categoryId" TEXT;

-- Create StockMovement
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "locationType" TEXT NOT NULL,
    "quantityDeltaBaseUnit" DECIMAL(20,10) NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StockMovement_ingredientId_locationType_idx" ON "StockMovement"("ingredientId", "locationType");
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate categoryName to categoryId
-- 1. Ensure Uncategorized exists
INSERT INTO "IngredientCategory" ("id", "name", "sortOrder", "isActive", "createdAt", "updatedAt")
VALUES ('cat_uncategorized', 'Uncategorized', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

-- 2. Insert distinct category names (skip empty)
INSERT INTO "IngredientCategory" ("id", "name", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT 
    'cat_' || substr(md5(random()::text), 1, 16),
    COALESCE(NULLIF(TRIM(d.n), ''), 'Uncategorized'),
    0,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (SELECT DISTINCT COALESCE(NULLIF(TRIM("categoryName"), ''), 'Uncategorized') AS n FROM "Ingredient") d
WHERE NOT EXISTS (SELECT 1 FROM "IngredientCategory" c WHERE c."name" = COALESCE(NULLIF(TRIM(d.n), ''), 'Uncategorized'));

-- 3. Update ingredients with categoryId
UPDATE "Ingredient" i
SET "categoryId" = c."id"
FROM "IngredientCategory" c
WHERE c."name" = COALESCE(NULLIF(TRIM(i."categoryName"), ''), 'Uncategorized');

-- 4. Drop categoryName (index drops with column)
ALTER TABLE "Ingredient" DROP COLUMN "categoryName";

-- 5. Add FK
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "IngredientCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Ingredient_categoryId_idx" ON "Ingredient"("categoryId");
