-- Add defaultSizeOptionId to MenuItem (for Sizes option group)
ALTER TABLE "MenuItem" ADD COLUMN "defaultSizeOptionId" TEXT;

CREATE INDEX "MenuItem_defaultSizeOptionId_idx" ON "MenuItem"("defaultSizeOptionId");

ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_defaultSizeOptionId_fkey" 
  FOREIGN KEY ("defaultSizeOptionId") REFERENCES "MenuOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
