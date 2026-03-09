-- CreateTable
CREATE TABLE "CloudStoreSetting" (
    "id" TEXT NOT NULL,
    "adminPinHash" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CloudStoreSetting_pkey" PRIMARY KEY ("id")
);

-- Insert initial row
INSERT INTO "CloudStoreSetting" ("id", "adminPinHash", "updatedAt") VALUES ('1', NULL, CURRENT_TIMESTAMP);
