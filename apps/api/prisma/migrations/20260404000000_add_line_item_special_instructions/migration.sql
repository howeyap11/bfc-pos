-- Add optional specialInstructions to TransactionLineItem for sticker prep (quoted below ice).
-- Keeps note for discount/audit; specialInstructions is prep-only so they stay separate.
ALTER TABLE "TransactionLineItem" ADD COLUMN "specialInstructions" TEXT;
