-- Add includedShots to CloudMenuItemSizePrice (free shots per size+temp; null = use item defaultShots)
ALTER TABLE "CloudMenuItemSizePrice" ADD COLUMN "includedShots" INTEGER;
