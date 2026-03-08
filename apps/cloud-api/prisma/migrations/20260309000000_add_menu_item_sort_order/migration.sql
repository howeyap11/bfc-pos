-- Add sortOrder to MenuItem for explicit ordering within subcategories
ALTER TABLE "MenuItem" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

