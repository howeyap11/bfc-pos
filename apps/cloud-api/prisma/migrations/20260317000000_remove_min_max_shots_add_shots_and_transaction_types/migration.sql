-- Remove minShots and maxShots from MenuItem (simplify shots model)
ALTER TABLE "MenuItem" DROP COLUMN IF EXISTS "minShots";
ALTER TABLE "MenuItem" DROP COLUMN IF EXISTS "maxShots";

-- ShotPricingRule: global extra-shot pricing
CREATE TABLE "ShotPricingRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Standard',
    "shotsPerBundle" INTEGER NOT NULL DEFAULT 2,
    "priceCentsPerBundle" INTEGER NOT NULL DEFAULT 4000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShotPricingRule_pkey" PRIMARY KEY ("id")
);

-- TransactionTypeSetting: global transaction types
CREATE TABLE "TransactionTypeSetting" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "priceDeltaCents" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TransactionTypeSetting_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TransactionTypeSetting_code_key" ON "TransactionTypeSetting"("code");

-- Default shot pricing rule: 40 pesos per 2 shots
INSERT INTO "ShotPricingRule" ("id", "name", "shotsPerBundle", "priceCentsPerBundle", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'Standard', 2, 4000, true, 0, NOW(), NOW());

-- Default transaction types
INSERT INTO "TransactionTypeSetting" ("id", "code", "label", "priceDeltaCents", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'FOR_HERE', 'For Here', 0, true, 0, NOW(), NOW()),
  (gen_random_uuid()::text, 'TO_GO', 'To Go', 0, true, 1, NOW(), NOW()),
  (gen_random_uuid()::text, 'FOODPANDA', 'FoodPanda', 2000, true, 2, NOW(), NOW()),
  (gen_random_uuid()::text, 'GRABFOOD', 'GrabFood', 0, true, 3, NOW(), NOW()),
  (gen_random_uuid()::text, 'BFC_APP', 'BFC App', 0, true, 4, NOW(), NOW());
