-- Add shots support to CloudMenuItem for syncing from cloud
ALTER TABLE "CloudMenuItem" ADD COLUMN "supportsShots" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CloudMenuItem" ADD COLUMN "defaultShots" INTEGER;
ALTER TABLE "CloudMenuItem" ADD COLUMN "defaultSizeOptionCloudId" TEXT;
