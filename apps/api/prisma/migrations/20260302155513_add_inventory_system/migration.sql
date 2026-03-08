-- AlterTable
ALTER TABLE "Item" ADD COLUMN "imagePath" TEXT;

-- CreateTable
CREATE TABLE "InventoryUnit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InventoryUnit_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "reorderLevel" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ingredient_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Ingredient_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "InventoryUnit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IngredientStock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "ingredientId" TEXT NOT NULL,
    "onHandQty" TEXT NOT NULL DEFAULT '0',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IngredientStock_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "IngredientStock_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MenuItemRecipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "menuItemId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "qtyPerItem" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MenuItemRecipe_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MenuItemRecipe_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuItemRecipe_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MenuItemRecipe_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "InventoryUnit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "ingredientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "qtyDelta" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "notes" TEXT,
    "createdByStaffId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryMovement_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InventoryMovement_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InventoryMovement_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "InventoryUnit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryCountSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" DATETIME,
    "approvedAt" DATETIME,
    "createdByStaffId" TEXT,
    "approvedByStaffId" TEXT,
    CONSTRAINT "InventoryCountSession_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryCountLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "countSessionId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "countedQty" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "notes" TEXT,
    CONSTRAINT "InventoryCountLine_countSessionId_fkey" FOREIGN KEY ("countSessionId") REFERENCES "InventoryCountSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InventoryCountLine_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InventoryCountLine_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "InventoryUnit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "InventoryUnit_storeId_idx" ON "InventoryUnit"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryUnit_storeId_code_key" ON "InventoryUnit"("storeId", "code");

-- CreateIndex
CREATE INDEX "Ingredient_storeId_idx" ON "Ingredient"("storeId");

-- CreateIndex
CREATE INDEX "Ingredient_unitId_idx" ON "Ingredient"("unitId");

-- CreateIndex
CREATE INDEX "Ingredient_isActive_idx" ON "Ingredient"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_storeId_name_key" ON "Ingredient"("storeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "IngredientStock_ingredientId_key" ON "IngredientStock"("ingredientId");

-- CreateIndex
CREATE INDEX "IngredientStock_storeId_idx" ON "IngredientStock"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "IngredientStock_storeId_ingredientId_key" ON "IngredientStock"("storeId", "ingredientId");

-- CreateIndex
CREATE INDEX "MenuItemRecipe_storeId_idx" ON "MenuItemRecipe"("storeId");

-- CreateIndex
CREATE INDEX "MenuItemRecipe_menuItemId_idx" ON "MenuItemRecipe"("menuItemId");

-- CreateIndex
CREATE INDEX "MenuItemRecipe_ingredientId_idx" ON "MenuItemRecipe"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemRecipe_storeId_menuItemId_ingredientId_key" ON "MenuItemRecipe"("storeId", "menuItemId", "ingredientId");

-- CreateIndex
CREATE INDEX "InventoryMovement_storeId_ingredientId_createdAt_idx" ON "InventoryMovement"("storeId", "ingredientId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_refType_refId_idx" ON "InventoryMovement"("refType", "refId");

-- CreateIndex
CREATE INDEX "InventoryMovement_storeId_idx" ON "InventoryMovement"("storeId");

-- CreateIndex
CREATE INDEX "InventoryCountSession_storeId_status_idx" ON "InventoryCountSession"("storeId", "status");

-- CreateIndex
CREATE INDEX "InventoryCountSession_storeId_startedAt_idx" ON "InventoryCountSession"("storeId", "startedAt");

-- CreateIndex
CREATE INDEX "InventoryCountLine_countSessionId_idx" ON "InventoryCountLine"("countSessionId");

-- CreateIndex
CREATE INDEX "InventoryCountLine_ingredientId_idx" ON "InventoryCountLine"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCountLine_countSessionId_ingredientId_key" ON "InventoryCountLine"("countSessionId", "ingredientId");
