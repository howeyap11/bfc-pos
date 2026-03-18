-- Add-on group metadata (from cloud AddOnGroup) for POS grouping
ALTER TABLE "CloudAddOn" ADD COLUMN "addOnGroupCloudId" TEXT;
ALTER TABLE "CloudAddOn" ADD COLUMN "addOnGroupName" TEXT;
ALTER TABLE "CloudAddOn" ADD COLUMN "addOnGroupSortOrder" INTEGER NOT NULL DEFAULT 0;
