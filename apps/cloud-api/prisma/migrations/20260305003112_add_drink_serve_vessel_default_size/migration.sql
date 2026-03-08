-- CreateEnum
CREATE TYPE "ServeVessel" AS ENUM ('PLASTIC_CUP', 'GLASS', 'OTHER');

-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "defaultSizeOptionId" TEXT,
ADD COLUMN     "isDrink" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "serveVessel" "ServeVessel";

-- AlterTable
ALTER TABLE "MenuOptionGroup" ADD COLUMN     "isSizeGroup" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "MenuItem_defaultSizeOptionId_idx" ON "MenuItem"("defaultSizeOptionId");

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_defaultSizeOptionId_fkey" FOREIGN KEY ("defaultSizeOptionId") REFERENCES "MenuOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
