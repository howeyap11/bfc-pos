-- Add cloudId to Staff for syncing from Cloud Admin (source of truth for names and PINs)
ALTER TABLE "Staff" ADD COLUMN "cloudId" TEXT;

CREATE UNIQUE INDEX "Staff_cloudId_key" ON "Staff"("cloudId");
