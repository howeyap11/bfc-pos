-- CloudMenuItem: drink fields
ALTER TABLE "CloudMenuItem" ADD COLUMN "isDrink" BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE "CloudMenuItem" ADD COLUMN "serveVessel" TEXT;
ALTER TABLE "CloudMenuItem" ADD COLUMN "defaultSizeOptionCloudId" TEXT;

-- CloudMenuOptionGroup: isSizeGroup
ALTER TABLE "CloudMenuOptionGroup" ADD COLUMN "isSizeGroup" BOOLEAN NOT NULL DEFAULT 0;

-- TransactionLineItem: sticker snapshot
ALTER TABLE "TransactionLineItem" ADD COLUMN "isDrink" BOOLEAN;
ALTER TABLE "TransactionLineItem" ADD COLUMN "serveVessel" TEXT;
