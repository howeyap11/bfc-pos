/*
  Warnings:

  - You are about to drop the column `defaultSizeOptionId` on the `MenuItem` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "DrinkTemp" AS ENUM ('HOT', 'ICED', 'ANY');

-- DropForeignKey
ALTER TABLE "MenuItem" DROP CONSTRAINT "MenuItem_defaultSizeOptionId_fkey";

-- DropIndex
DROP INDEX "MenuItem_defaultSizeOptionId_idx";

-- AlterTable
ALTER TABLE "MenuItem" DROP COLUMN "defaultSizeOptionId",
ADD COLUMN     "defaultSizeId" TEXT;

-- CreateTable
CREATE TABLE "MenuItemSize" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "temp" "DrinkTemp" NOT NULL DEFAULT 'ANY',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItemSize_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MenuItemSize_menuItemId_idx" ON "MenuItemSize"("menuItemId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemSize_menuItemId_label_temp_key" ON "MenuItemSize"("menuItemId", "label", "temp");

-- CreateIndex
CREATE INDEX "MenuItem_defaultSizeId_idx" ON "MenuItem"("defaultSizeId");

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_defaultSizeId_fkey" FOREIGN KEY ("defaultSizeId") REFERENCES "MenuItemSize"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemSize" ADD CONSTRAINT "MenuItemSize_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
