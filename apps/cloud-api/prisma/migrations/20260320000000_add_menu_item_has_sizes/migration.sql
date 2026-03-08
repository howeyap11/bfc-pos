-- Add hasSizes to MenuItem (drink sizes toggle)
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "hasSizes" BOOLEAN NOT NULL DEFAULT false;
