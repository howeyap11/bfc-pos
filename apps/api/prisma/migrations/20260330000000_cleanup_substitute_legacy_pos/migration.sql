-- Substitute recipe matrix: ingredient + qty + unit (replace qtyMl)
-- Recreate table with new columns; backfill from qtyMl
CREATE TABLE "CloudSubstituteRecipeConsumption_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "substituteCloudId" TEXT NOT NULL,
    "sizeCloudId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "ingredientCloudId" TEXT NOT NULL,
    "qtyPerItem" TEXT NOT NULL,
    "unitCode" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "CloudSubstituteRecipeConsumption_new" ("id", "storeId", "substituteCloudId", "sizeCloudId", "mode", "ingredientCloudId", "qtyPerItem", "unitCode", "createdAt", "updatedAt")
SELECT "id", "storeId", "substituteCloudId", "sizeCloudId", "mode",
  COALESCE((SELECT "cloudId" FROM "CloudIngredient" LIMIT 1), ''),
  COALESCE("qtyMl", '0'),
  'ml',
  "createdAt", "updatedAt"
FROM "CloudSubstituteRecipeConsumption";

DROP TABLE "CloudSubstituteRecipeConsumption";
ALTER TABLE "CloudSubstituteRecipeConsumption_new" RENAME TO "CloudSubstituteRecipeConsumption";

CREATE UNIQUE INDEX "CloudSubstituteRecipeConsumption_storeId_substituteCloudId_sizeCloudId_mode_key" ON "CloudSubstituteRecipeConsumption"("storeId", "substituteCloudId", "sizeCloudId", "mode");
CREATE INDEX "CloudSubstituteRecipeConsumption_storeId_idx" ON "CloudSubstituteRecipeConsumption"("storeId");
CREATE INDEX "CloudSubstituteRecipeConsumption_substituteCloudId_idx" ON "CloudSubstituteRecipeConsumption"("substituteCloudId");
CREATE INDEX "CloudSubstituteRecipeConsumption_sizeCloudId_idx" ON "CloudSubstituteRecipeConsumption"("sizeCloudId");

-- Remove per-item substitute fields (use global matrix only)
CREATE TABLE "CloudMenuItemSubstitute_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "menuItemCloudId" TEXT NOT NULL,
    "substituteCloudId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "CloudMenuItemSubstitute_new" ("id", "storeId", "menuItemCloudId", "substituteCloudId", "createdAt", "updatedAt")
SELECT "id", "storeId", "menuItemCloudId", "substituteCloudId", "createdAt", "updatedAt"
FROM "CloudMenuItemSubstitute";

DROP TABLE "CloudMenuItemSubstitute";
ALTER TABLE "CloudMenuItemSubstitute_new" RENAME TO "CloudMenuItemSubstitute";

CREATE UNIQUE INDEX "CloudMenuItemSubstitute_storeId_menuItemCloudId_substituteCloudId_key" ON "CloudMenuItemSubstitute"("storeId", "menuItemCloudId", "substituteCloudId");
CREATE INDEX "CloudMenuItemSubstitute_storeId_idx" ON "CloudMenuItemSubstitute"("storeId");
CREATE INDEX "CloudMenuItemSubstitute_menuItemCloudId_idx" ON "CloudMenuItemSubstitute"("menuItemCloudId");
CREATE INDEX "CloudMenuItemSubstitute_substituteCloudId_idx" ON "CloudMenuItemSubstitute"("substituteCloudId");
