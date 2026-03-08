-- Add shot control fields to MenuItem (POS-ready)
ALTER TABLE "MenuItem" ADD COLUMN "supportsShots" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MenuItem" ADD COLUMN "defaultShots" INTEGER;
ALTER TABLE "MenuItem" ADD COLUMN "minShots" INTEGER;
ALTER TABLE "MenuItem" ADD COLUMN "maxShots" INTEGER;
