-- Add shotsPerSizeEnabled to MenuItem (when true, POS uses per-size+temp includedShots from MenuItemSizePrice)
ALTER TABLE "MenuItem" ADD COLUMN "shotsPerSizeEnabled" BOOLEAN NOT NULL DEFAULT false;
