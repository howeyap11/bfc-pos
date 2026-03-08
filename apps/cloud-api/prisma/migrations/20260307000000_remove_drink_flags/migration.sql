-- AlterTable: remove isDrink and serveVessel from MenuItem
ALTER TABLE "MenuItem" DROP COLUMN IF EXISTS "isDrink";
ALTER TABLE "MenuItem" DROP COLUMN IF EXISTS "serveVessel";

-- DropEnum: ServeVessel only if no other table uses it (MenuItem was the only one)
DROP TYPE IF EXISTS "ServeVessel";
