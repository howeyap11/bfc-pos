-- AlterTable: add isSystem, isDeletable to MenuOptionGroup
ALTER TABLE "MenuOptionGroup" ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MenuOptionGroup" ADD COLUMN "isDeletable" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: add sortOrder to MenuOption
ALTER TABLE "MenuOption" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
