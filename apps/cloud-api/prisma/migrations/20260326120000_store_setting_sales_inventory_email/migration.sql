-- AlterTable
ALTER TABLE "StoreSetting" ADD COLUMN "reportRecipientEmail" TEXT;
ALTER TABLE "StoreSetting" ADD COLUMN "dailySalesEmailTimeLocal" TEXT NOT NULL DEFAULT '00:30';
ALTER TABLE "StoreSetting" ADD COLUMN "inventoryEmailEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StoreSetting" ADD COLUMN "inventoryReportType" TEXT NOT NULL DEFAULT 'Ingredients Input Based';
ALTER TABLE "StoreSetting" ADD COLUMN "fixedServiceChargePercent" INTEGER NOT NULL DEFAULT 10;
