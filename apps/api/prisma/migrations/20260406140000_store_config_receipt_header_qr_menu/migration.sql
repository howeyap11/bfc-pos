-- AlterTable: receipt header fields synced from cloud + local QR menu toggle
ALTER TABLE "StoreConfig" ADD COLUMN "receiptTaxType" TEXT;
ALTER TABLE "StoreConfig" ADD COLUMN "receiptNonVatTin" TEXT;
ALTER TABLE "StoreConfig" ADD COLUMN "receiptVatTin" TEXT;
ALTER TABLE "StoreConfig" ADD COLUMN "receiptBirMin" TEXT;
ALTER TABLE "StoreConfig" ADD COLUMN "receiptBirSerialNo" TEXT;
ALTER TABLE "StoreConfig" ADD COLUMN "qrMenuEnabled" BOOLEAN NOT NULL DEFAULT 1;
