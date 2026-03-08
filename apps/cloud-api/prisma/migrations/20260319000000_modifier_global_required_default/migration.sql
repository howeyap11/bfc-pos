-- Move required/default to global modifier section (MenuOptionGroup)
-- Remove item-level required/default from MenuItemOptionGroup

-- Add defaultOptionId to MenuOptionGroup
ALTER TABLE "MenuOptionGroup" ADD COLUMN "defaultOptionId" TEXT;
CREATE INDEX "MenuOptionGroup_defaultOptionId_idx" ON "MenuOptionGroup"("defaultOptionId");
ALTER TABLE "MenuOptionGroup" ADD CONSTRAINT "MenuOptionGroup_defaultOptionId_fkey"
  FOREIGN KEY ("defaultOptionId") REFERENCES "MenuOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Remove item-level fields from MenuItemOptionGroup
ALTER TABLE "MenuItemOptionGroup" DROP CONSTRAINT IF EXISTS "MenuItemOptionGroup_defaultOptionId_fkey";
DROP INDEX IF EXISTS "MenuItemOptionGroup_defaultOptionId_idx";
ALTER TABLE "MenuItemOptionGroup" DROP COLUMN IF EXISTS "defaultOptionId";
ALTER TABLE "MenuItemOptionGroup" DROP COLUMN IF EXISTS "isRequired";
