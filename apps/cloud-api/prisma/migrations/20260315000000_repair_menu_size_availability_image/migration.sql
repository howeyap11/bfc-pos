-- Repair: ensure imageUrl exists on MenuSizeAvailability (variant-level)
-- Handles drift where migration 20260314000000 may not have been applied
-- PostgreSQL: IF NOT EXISTS for ADD COLUMN (PG 9.6+)
ALTER TABLE "MenuSizeAvailability" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- Ensure MenuSize does NOT have imageUrl (in case 20260313000000 was applied but 20260314000000 wasn't)
ALTER TABLE "MenuSize" DROP COLUMN IF EXISTS "imageUrl";
