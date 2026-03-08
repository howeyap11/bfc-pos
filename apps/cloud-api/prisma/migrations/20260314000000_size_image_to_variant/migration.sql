-- Move imageUrl from MenuSize to MenuSizeAvailability (variant-level)
ALTER TABLE "MenuSizeAvailability" ADD COLUMN "imageUrl" TEXT;

-- Backfill: copy existing MenuSize.imageUrl to all its availability rows
UPDATE "MenuSizeAvailability" av
SET "imageUrl" = s."imageUrl"
FROM "MenuSize" s
WHERE av."sizeId" = s.id AND s."imageUrl" IS NOT NULL;

-- Drop from MenuSize
ALTER TABLE "MenuSize" DROP COLUMN "imageUrl";
