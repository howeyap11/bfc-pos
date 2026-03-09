-- CreateTable
CREATE TABLE "MenuItemSizePrice" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "baseType" "DrinkMode" NOT NULL,
    "sizeOptionId" TEXT NOT NULL,
    "sizeCode" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItemSizePrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemSizePrice_menuItemId_baseType_sizeOptionId_key" ON "MenuItemSizePrice"("menuItemId", "baseType", "sizeOptionId");

-- CreateIndex
CREATE INDEX "MenuItemSizePrice_menuItemId_idx" ON "MenuItemSizePrice"("menuItemId");

-- CreateIndex
CREATE INDEX "MenuItemSizePrice_sizeOptionId_idx" ON "MenuItemSizePrice"("sizeOptionId");

-- AddForeignKey
ALTER TABLE "MenuItemSizePrice" ADD CONSTRAINT "MenuItemSizePrice_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemSizePrice" ADD CONSTRAINT "MenuItemSizePrice_sizeOptionId_fkey" FOREIGN KEY ("sizeOptionId") REFERENCES "MenuOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
