-- Add defaultSubstituteOptionId to MenuItem (nullable, FK added after SubstituteOption table exists)
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "defaultSubstituteOptionId" TEXT;

-- CreateTable AddOnGroup
CREATE TABLE "AddOnGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddOnGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable AddOnOption
CREATE TABLE "AddOnOption" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddOnOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable AddOnOptionRecipeLine
CREATE TABLE "AddOnOptionRecipeLine" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "qtyPerItem" DECIMAL(20,10) NOT NULL,
    "unitCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddOnOptionRecipeLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable MenuItemAddOnGroup
CREATE TABLE "MenuItemAddOnGroup" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "MenuItemAddOnGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable SubstituteGroup
CREATE TABLE "SubstituteGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubstituteGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable SubstituteOption
CREATE TABLE "SubstituteOption" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubstituteOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable SubstituteOptionRecipeLine
CREATE TABLE "SubstituteOptionRecipeLine" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "qtyPerItem" DECIMAL(20,10) NOT NULL,
    "unitCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubstituteOptionRecipeLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable MenuItemSubstituteGroup
CREATE TABLE "MenuItemSubstituteGroup" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "MenuItemSubstituteGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AddOnGroup_sortOrder_idx" ON "AddOnGroup"("sortOrder");

CREATE INDEX "AddOnOption_groupId_idx" ON "AddOnOption"("groupId");
CREATE INDEX "AddOnOption_sortOrder_idx" ON "AddOnOption"("sortOrder");

CREATE UNIQUE INDEX "AddOnOptionRecipeLine_optionId_ingredientId_key" ON "AddOnOptionRecipeLine"("optionId", "ingredientId");
CREATE INDEX "AddOnOptionRecipeLine_optionId_idx" ON "AddOnOptionRecipeLine"("optionId");
CREATE INDEX "AddOnOptionRecipeLine_ingredientId_idx" ON "AddOnOptionRecipeLine"("ingredientId");

CREATE UNIQUE INDEX "MenuItemAddOnGroup_itemId_groupId_key" ON "MenuItemAddOnGroup"("itemId", "groupId");
CREATE INDEX "MenuItemAddOnGroup_itemId_idx" ON "MenuItemAddOnGroup"("itemId");
CREATE INDEX "MenuItemAddOnGroup_groupId_idx" ON "MenuItemAddOnGroup"("groupId");

CREATE INDEX "SubstituteGroup_sortOrder_idx" ON "SubstituteGroup"("sortOrder");

CREATE INDEX "SubstituteOption_groupId_idx" ON "SubstituteOption"("groupId");
CREATE INDEX "SubstituteOption_sortOrder_idx" ON "SubstituteOption"("sortOrder");

CREATE UNIQUE INDEX "SubstituteOptionRecipeLine_optionId_ingredientId_key" ON "SubstituteOptionRecipeLine"("optionId", "ingredientId");
CREATE INDEX "SubstituteOptionRecipeLine_optionId_idx" ON "SubstituteOptionRecipeLine"("optionId");
CREATE INDEX "SubstituteOptionRecipeLine_ingredientId_idx" ON "SubstituteOptionRecipeLine"("ingredientId");

CREATE UNIQUE INDEX "MenuItemSubstituteGroup_itemId_groupId_key" ON "MenuItemSubstituteGroup"("itemId", "groupId");
CREATE INDEX "MenuItemSubstituteGroup_itemId_idx" ON "MenuItemSubstituteGroup"("itemId");
CREATE INDEX "MenuItemSubstituteGroup_groupId_idx" ON "MenuItemSubstituteGroup"("groupId");

CREATE INDEX "MenuItem_defaultSubstituteOptionId_idx" ON "MenuItem"("defaultSubstituteOptionId");

-- AddForeignKey
ALTER TABLE "AddOnOption" ADD CONSTRAINT "AddOnOption_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AddOnGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AddOnOptionRecipeLine" ADD CONSTRAINT "AddOnOptionRecipeLine_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "AddOnOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AddOnOptionRecipeLine" ADD CONSTRAINT "AddOnOptionRecipeLine_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MenuItemAddOnGroup" ADD CONSTRAINT "MenuItemAddOnGroup_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MenuItemAddOnGroup" ADD CONSTRAINT "MenuItemAddOnGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AddOnGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubstituteOption" ADD CONSTRAINT "SubstituteOption_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SubstituteGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubstituteOptionRecipeLine" ADD CONSTRAINT "SubstituteOptionRecipeLine_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "SubstituteOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubstituteOptionRecipeLine" ADD CONSTRAINT "SubstituteOptionRecipeLine_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MenuItemSubstituteGroup" ADD CONSTRAINT "MenuItemSubstituteGroup_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MenuItemSubstituteGroup" ADD CONSTRAINT "MenuItemSubstituteGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SubstituteGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_defaultSubstituteOptionId_fkey" FOREIGN KEY ("defaultSubstituteOptionId") REFERENCES "SubstituteOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
