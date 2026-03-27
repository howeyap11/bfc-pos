-- CreateTable
CREATE TABLE "ReceiptDetails" (
    "id" TEXT NOT NULL,
    "taxType" TEXT NOT NULL DEFAULT 'NONVAT Registered',
    "receiptMessage" TEXT,
    "birEnabled" BOOLEAN NOT NULL DEFAULT true,
    "permitNo" TEXT,
    "issueDate" TEXT,
    "nonVatTin" TEXT,
    "vatTin" TEXT,
    "birMin" TEXT,
    "birSerialNo" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceiptDetails_pkey" PRIMARY KEY ("id")
);

INSERT INTO "ReceiptDetails" ("id", "taxType", "receiptMessage", "birEnabled", "permitNo", "issueDate", "nonVatTin", "vatTin", "birMin", "birSerialNo", "updatedAt")
VALUES (
    '1',
    'NONVAT Registered',
    NULL,
    true,
    'FP032025-099-0506656-00000',
    '03/28/2025',
    '615-748-778-000',
    '011-448-443-991',
    '25032408594953160',
    'HA1Q5EQS',
    CURRENT_TIMESTAMP
);
