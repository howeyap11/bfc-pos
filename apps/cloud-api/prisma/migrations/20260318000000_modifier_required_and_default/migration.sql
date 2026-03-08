-- Add item-level modifier assignment settings
ALTER TABLE "MenuItemOptionGroup" ADD COLUMN "isRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MenuItemOptionGroup" ADD COLUMN "defaultOptionId" TEXT;

-- CreateIndex
CREATE INDEX "MenuItemOptionGroup_defaultOptionId_idx" ON "MenuItemOptionGroup"("defaultOptionId");

-- AddForeignKey
ALTER TABLE "MenuItemOptionGroup" ADD CONSTRAINT "MenuItemOptionGroup_defaultOptionId_fkey" 
  FOREIGN KEY ("defaultOptionId") REFERENCES "MenuOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
