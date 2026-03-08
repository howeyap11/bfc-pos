/*
  Warnings:

  - You are about to drop the `Sale` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SaleLineItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalePayment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "Sale_storeId_saleNo_key";

-- DropIndex
DROP INDEX "Sale_tabId_idx";

-- DropIndex
DROP INDEX "Sale_tableId_idx";

-- DropIndex
DROP INDEX "Sale_orderId_idx";

-- DropIndex
DROP INDEX "Sale_registerSessionId_idx";

-- DropIndex
DROP INDEX "Sale_storeId_createdAt_idx";

-- DropIndex
DROP INDEX "Sale_orderId_key";

-- DropIndex
DROP INDEX "SaleLineItem_itemId_idx";

-- DropIndex
DROP INDEX "SaleLineItem_saleId_idx";

-- DropIndex
DROP INDEX "SalePayment_method_idx";

-- DropIndex
DROP INDEX "SalePayment_saleId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Sale";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "SaleLineItem";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "SalePayment";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "StoreConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "enabledPaymentMethods" TEXT NOT NULL DEFAULT '["CASH","CARD","GCASH","FOODPANDA"]',
    "splitPaymentEnabled" BOOLEAN NOT NULL DEFAULT true,
    "paymentMethodOrder" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StoreConfig_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "name" TEXT NOT NULL,
    "passcode" TEXT NOT NULL DEFAULT '1000',
    "key" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CASHIER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Staff_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "transactionNo" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PAID',
    "source" TEXT NOT NULL DEFAULT 'POS',
    "serviceType" TEXT NOT NULL DEFAULT 'DINE_IN',
    "registerSessionId" TEXT,
    "orderId" TEXT,
    "tableId" TEXT,
    "tabId" TEXT,
    "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "serviceCents" INTEGER NOT NULL DEFAULT 0,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "voidedAt" DATETIME,
    "voidedBy" TEXT,
    "voidReason" TEXT,
    CONSTRAINT "Transaction_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_registerSessionId_fkey" FOREIGN KEY ("registerSessionId") REFERENCES "RegisterSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "Tab" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransactionLineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionId" TEXT NOT NULL,
    "itemId" TEXT,
    "name" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL DEFAULT 0,
    "modifiersCents" INTEGER NOT NULL DEFAULT 0,
    "lineTotal" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "optionsJson" TEXT,
    CONSTRAINT "TransactionLineItem_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TransactionLineItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransactionPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PAID',
    "amountCents" INTEGER NOT NULL,
    "refNo" TEXT,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedBy" TEXT,
    CONSTRAINT "TransactionPayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransactionRefund" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionId" TEXT NOT NULL,
    "refundedByStaffId" TEXT,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransactionRefund_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransactionRefundItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "refundId" TEXT NOT NULL,
    "transactionLineItemId" TEXT NOT NULL,
    "qtyRefunded" INTEGER NOT NULL,
    "amountRefundedCents" INTEGER NOT NULL,
    CONSTRAINT "TransactionRefundItem_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "TransactionRefund" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TransactionRefundItem_transactionLineItemId_fkey" FOREIGN KEY ("transactionLineItemId") REFERENCES "TransactionLineItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SopTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SopTemplate_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SopTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "requiresPhoto" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SopTask_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SopTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SopCompletion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedBy" TEXT,
    "note" TEXT,
    "photoPath" TEXT,
    CONSTRAINT "SopCompletion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SopTemplate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SopCompletion_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "SopTask" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "series" TEXT,
    "basePrice" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "foodpandaSurchargeCents" INTEGER NOT NULL DEFAULT 2000,
    "defaultMilk" TEXT NOT NULL DEFAULT 'FULL_CREAM',
    "supportsShots" BOOLEAN NOT NULL DEFAULT false,
    "isEspressoDrink" BOOLEAN NOT NULL DEFAULT false,
    "shotsPricingMode" TEXT,
    "defaultShots12oz" INTEGER NOT NULL DEFAULT 0,
    "defaultShots16oz" INTEGER NOT NULL DEFAULT 0,
    "shotsDefaultSource" TEXT NOT NULL DEFAULT 'MANUAL',
    "defaultEspressoShots" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT NOT NULL,
    CONSTRAINT "Item_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Item" ("basePrice", "categoryId", "description", "id", "isActive", "isHidden", "name", "sort", "storeId") SELECT "basePrice", "categoryId", "description", "id", "isActive", "isHidden", "name", "sort", "storeId" FROM "Item";
DROP TABLE "Item";
ALTER TABLE "new_Item" RENAME TO "Item";
CREATE INDEX "Item_storeId_idx" ON "Item"("storeId");
CREATE INDEX "Item_categoryId_idx" ON "Item"("categoryId");
CREATE UNIQUE INDEX "Item_categoryId_name_key" ON "Item"("categoryId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "StoreConfig_storeId_key" ON "StoreConfig"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_key_key" ON "Staff"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_storeId_name_key" ON "Staff"("storeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_orderId_key" ON "Transaction"("orderId");

-- CreateIndex
CREATE INDEX "Transaction_storeId_createdAt_idx" ON "Transaction"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_registerSessionId_idx" ON "Transaction"("registerSessionId");

-- CreateIndex
CREATE INDEX "Transaction_orderId_idx" ON "Transaction"("orderId");

-- CreateIndex
CREATE INDEX "Transaction_tableId_idx" ON "Transaction"("tableId");

-- CreateIndex
CREATE INDEX "Transaction_tabId_idx" ON "Transaction"("tabId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_storeId_transactionNo_key" ON "Transaction"("storeId", "transactionNo");

-- CreateIndex
CREATE INDEX "TransactionLineItem_transactionId_idx" ON "TransactionLineItem"("transactionId");

-- CreateIndex
CREATE INDEX "TransactionLineItem_itemId_idx" ON "TransactionLineItem"("itemId");

-- CreateIndex
CREATE INDEX "TransactionPayment_transactionId_idx" ON "TransactionPayment"("transactionId");

-- CreateIndex
CREATE INDEX "TransactionPayment_method_idx" ON "TransactionPayment"("method");

-- CreateIndex
CREATE INDEX "TransactionRefund_transactionId_idx" ON "TransactionRefund"("transactionId");

-- CreateIndex
CREATE INDEX "TransactionRefundItem_refundId_idx" ON "TransactionRefundItem"("refundId");

-- CreateIndex
CREATE INDEX "TransactionRefundItem_transactionLineItemId_idx" ON "TransactionRefundItem"("transactionLineItemId");

-- CreateIndex
CREATE INDEX "SopTemplate_storeId_idx" ON "SopTemplate"("storeId");

-- CreateIndex
CREATE INDEX "SopTemplate_storeId_isActive_idx" ON "SopTemplate"("storeId", "isActive");

-- CreateIndex
CREATE INDEX "SopTask_templateId_idx" ON "SopTask"("templateId");

-- CreateIndex
CREATE INDEX "SopTask_templateId_sort_idx" ON "SopTask"("templateId", "sort");

-- CreateIndex
CREATE INDEX "SopCompletion_templateId_completedAt_idx" ON "SopCompletion"("templateId", "completedAt");

-- CreateIndex
CREATE INDEX "SopCompletion_taskId_completedAt_idx" ON "SopCompletion"("taskId", "completedAt");

-- CreateIndex
CREATE INDEX "SopCompletion_completedAt_idx" ON "SopCompletion"("completedAt");
