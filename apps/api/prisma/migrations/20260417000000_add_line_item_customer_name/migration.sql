-- Add optional customerName to TransactionLineItem for sticker (left of temp/size).
ALTER TABLE "TransactionLineItem" ADD COLUMN "customerName" TEXT;
