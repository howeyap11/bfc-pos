-- CreateTable
CREATE TABLE "StoreSetting" (
    "id" TEXT NOT NULL,
    "adminPinHash" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSetting_pkey" PRIMARY KEY ("id")
);

-- Seed default row
INSERT INTO "StoreSetting" ("id", "adminPinHash", "updatedAt") VALUES ('1', NULL, CURRENT_TIMESTAMP);
