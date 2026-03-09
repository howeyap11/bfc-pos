-- AlterTable
ALTER TABLE "MenuOptionGroup" ADD COLUMN "trackRecipeConsumption" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "OptionChoiceRecipeLine" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "qtyPerItem" DECIMAL(20,10) NOT NULL,
    "unitCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptionChoiceRecipeLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddOn" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddOnRecipeLine" (
    "id" TEXT NOT NULL,
    "addOnId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "qtyPerItem" DECIMAL(20,10) NOT NULL,
    "unitCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddOnRecipeLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemAddOn" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "addOnId" TEXT NOT NULL,

    CONSTRAINT "MenuItemAddOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Substitute" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Substitute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubstituteRecipeLine" (
    "id" TEXT NOT NULL,
    "substituteId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "qtyPerItem" DECIMAL(20,10) NOT NULL,
    "unitCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubstituteRecipeLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemSubstitute" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "substituteId" TEXT NOT NULL,

    CONSTRAINT "MenuItemSubstitute_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN "defaultSubstituteId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "OptionChoiceRecipeLine_optionId_ingredientId_key" ON "OptionChoiceRecipeLine"("optionId", "ingredientId");

-- CreateIndex
CREATE INDEX "OptionChoiceRecipeLine_optionId_idx" ON "OptionChoiceRecipeLine"("optionId");

-- CreateIndex
CREATE INDEX "OptionChoiceRecipeLine_ingredientId_idx" ON "OptionChoiceRecipeLine"("ingredientId");

-- CreateIndex
CREATE INDEX "AddOn_sortOrder_idx" ON "AddOn"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AddOnRecipeLine_addOnId_ingredientId_key" ON "AddOnRecipeLine"("addOnId", "ingredientId");

-- CreateIndex
CREATE INDEX "AddOnRecipeLine_addOnId_idx" ON "AddOnRecipeLine"("addOnId");

-- CreateIndex
CREATE INDEX "AddOnRecipeLine_ingredientId_idx" ON "AddOnRecipeLine"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemAddOn_itemId_addOnId_key" ON "MenuItemAddOn"("itemId", "addOnId");

-- CreateIndex
CREATE INDEX "MenuItemAddOn_itemId_idx" ON "MenuItemAddOn"("itemId");

-- CreateIndex
CREATE INDEX "MenuItemAddOn_addOnId_idx" ON "MenuItemAddOn"("addOnId");

-- CreateIndex
CREATE INDEX "Substitute_sortOrder_idx" ON "Substitute"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SubstituteRecipeLine_substituteId_ingredientId_key" ON "SubstituteRecipeLine"("substituteId", "ingredientId");

-- CreateIndex
CREATE INDEX "SubstituteRecipeLine_substituteId_idx" ON "SubstituteRecipeLine"("substituteId");

-- CreateIndex
CREATE INDEX "SubstituteRecipeLine_ingredientId_idx" ON "SubstituteRecipeLine"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemSubstitute_itemId_substituteId_key" ON "MenuItemSubstitute"("itemId", "substituteId");

-- CreateIndex
CREATE INDEX "MenuItemSubstitute_itemId_idx" ON "MenuItemSubstitute"("itemId");

-- CreateIndex
CREATE INDEX "MenuItemSubstitute_substituteId_idx" ON "MenuItemSubstitute"("substituteId");

-- CreateIndex
CREATE INDEX "MenuItem_defaultSubstituteId_idx" ON "MenuItem"("defaultSubstituteId");

-- AddForeignKey
ALTER TABLE "OptionChoiceRecipeLine" ADD CONSTRAINT "OptionChoiceRecipeLine_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "MenuOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionChoiceRecipeLine" ADD CONSTRAINT "OptionChoiceRecipeLine_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddOnRecipeLine" ADD CONSTRAINT "AddOnRecipeLine_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "AddOn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddOnRecipeLine" ADD CONSTRAINT "AddOnRecipeLine_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemAddOn" ADD CONSTRAINT "MenuItemAddOn_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemAddOn" ADD CONSTRAINT "MenuItemAddOn_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "AddOn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubstituteRecipeLine" ADD CONSTRAINT "SubstituteRecipeLine_substituteId_fkey" FOREIGN KEY ("substituteId") REFERENCES "Substitute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubstituteRecipeLine" ADD CONSTRAINT "SubstituteRecipeLine_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemSubstitute" ADD CONSTRAINT "MenuItemSubstitute_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemSubstitute" ADD CONSTRAINT "MenuItemSubstitute_substituteId_fkey" FOREIGN KEY ("substituteId") REFERENCES "Substitute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_defaultSubstituteId_fkey" FOREIGN KEY ("defaultSubstituteId") REFERENCES "Substitute"("id") ON DELETE SET NULL ON UPDATE CASCADE;
