-- CreateEnum
CREATE TYPE "DrinkMode" AS ENUM ('ICED', 'HOT', 'CONCENTRATED');

-- CreateTable
CREATE TABLE "MenuItemDrinkSizeConfig" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "mode" "DrinkMode" NOT NULL,
    "optionId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItemDrinkSizeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemDrinkModeDefault" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "mode" "DrinkMode" NOT NULL,
    "defaultOptionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItemDrinkModeDefault_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemDrinkSizeConfig_menuItemId_mode_optionId_key" ON "MenuItemDrinkSizeConfig"("menuItemId", "mode", "optionId");

-- CreateIndex
CREATE INDEX "MenuItemDrinkSizeConfig_menuItemId_idx" ON "MenuItemDrinkSizeConfig"("menuItemId");

-- CreateIndex
CREATE INDEX "MenuItemDrinkSizeConfig_optionId_idx" ON "MenuItemDrinkSizeConfig"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemDrinkModeDefault_menuItemId_mode_key" ON "MenuItemDrinkModeDefault"("menuItemId", "mode");

-- CreateIndex
CREATE INDEX "MenuItemDrinkModeDefault_menuItemId_idx" ON "MenuItemDrinkModeDefault"("menuItemId");

-- CreateIndex
CREATE INDEX "MenuItemDrinkModeDefault_defaultOptionId_idx" ON "MenuItemDrinkModeDefault"("defaultOptionId");

-- AddForeignKey
ALTER TABLE "MenuItemDrinkSizeConfig" ADD CONSTRAINT "MenuItemDrinkSizeConfig_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemDrinkSizeConfig" ADD CONSTRAINT "MenuItemDrinkSizeConfig_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "MenuOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemDrinkModeDefault" ADD CONSTRAINT "MenuItemDrinkModeDefault_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemDrinkModeDefault" ADD CONSTRAINT "MenuItemDrinkModeDefault_defaultOptionId_fkey" FOREIGN KEY ("defaultOptionId") REFERENCES "MenuOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
