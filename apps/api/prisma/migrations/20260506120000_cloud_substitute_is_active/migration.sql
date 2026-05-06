-- Inactive milk substitutes (from Cloud catalog) are hidden on POS; default true for existing rows.
ALTER TABLE "CloudSubstitute" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT 1;
