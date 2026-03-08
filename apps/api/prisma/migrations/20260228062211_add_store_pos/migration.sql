-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'store_1',
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "Zone_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Table" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "zoneId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFunctionRoom" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Table_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Table_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "name" TEXT NOT NULL,
    "prepArea" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Category_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "basePrice" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT NOT NULL,
    CONSTRAINT "Item_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ItemImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ItemImage_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OptionGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "minSelect" INTEGER NOT NULL DEFAULT 0,
    "maxSelect" INTEGER NOT NULL DEFAULT 1,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "OptionGroup_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Option" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceDelta" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sort" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Option_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Option_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "OptionGroup" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ItemOptionGroup" (
    "itemId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    PRIMARY KEY ("itemId", "groupId"),
    CONSTRAINT "ItemOptionGroup_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemOptionGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "OptionGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tab" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "tableId" TEXT NOT NULL,
    "quotaCents" INTEGER NOT NULL DEFAULT 300000,
    "note" TEXT,
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    CONSTRAINT "Tab_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Tab_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "orderNo" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLACED',
    "source" TEXT NOT NULL DEFAULT 'QR_UNPAID',
    "tableId" TEXT NOT NULL,
    "tabId" TEXT,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "externalRef" TEXT,
    "customerNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "Tab" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL DEFAULT 0,
    "lineNote" TEXT,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderItemOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderItemId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "priceDelta" INTEGER NOT NULL,
    CONSTRAINT "OrderItemOption_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItemOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "Option" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VoidRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedBy" TEXT,
    "decidedAt" DATETIME,
    "decidedBy" TEXT,
    "managerNote" TEXT,
    CONSTRAINT "VoidRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MenuBanner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MenuBanner_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RegisterSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedBy" TEXT,
    "openingCash" INTEGER NOT NULL DEFAULT 0,
    "closedAt" DATETIME,
    "closedBy" TEXT,
    "closingCash" INTEGER,
    "expectedCash" INTEGER,
    "varianceCash" INTEGER,
    "note" TEXT,
    CONSTRAINT "RegisterSession_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "saleNo" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PAID',
    "source" TEXT NOT NULL DEFAULT 'POS',
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
    CONSTRAINT "Sale_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Sale_registerSessionId_fkey" FOREIGN KEY ("registerSessionId") REFERENCES "RegisterSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sale_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sale_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sale_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "Tab" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SaleLineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleId" TEXT NOT NULL,
    "itemId" TEXT,
    "name" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL DEFAULT 0,
    "modifiersCents" INTEGER NOT NULL DEFAULT 0,
    "lineTotal" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "optionsJson" TEXT,
    CONSTRAINT "SaleLineItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SaleLineItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalePayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PAID',
    "amountCents" INTEGER NOT NULL,
    "refNo" TEXT,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedBy" TEXT,
    CONSTRAINT "SalePayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "actorId" TEXT,
    "note" TEXT,
    "metaJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Store_code_key" ON "Store"("code");

-- CreateIndex
CREATE INDEX "Zone_storeId_idx" ON "Zone"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "Zone_storeId_code_key" ON "Zone"("storeId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Table_publicKey_key" ON "Table"("publicKey");

-- CreateIndex
CREATE INDEX "Table_storeId_idx" ON "Table"("storeId");

-- CreateIndex
CREATE INDEX "Table_zoneId_idx" ON "Table"("zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "Table_zoneId_label_key" ON "Table"("zoneId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Category_storeId_idx" ON "Category"("storeId");

-- CreateIndex
CREATE INDEX "Item_storeId_idx" ON "Item"("storeId");

-- CreateIndex
CREATE INDEX "Item_categoryId_idx" ON "Item"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Item_categoryId_name_key" ON "Item"("categoryId", "name");

-- CreateIndex
CREATE INDEX "ItemImage_itemId_idx" ON "ItemImage"("itemId");

-- CreateIndex
CREATE INDEX "ItemImage_itemId_isPrimary_idx" ON "ItemImage"("itemId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "OptionGroup_name_key" ON "OptionGroup"("name");

-- CreateIndex
CREATE INDEX "OptionGroup_storeId_idx" ON "OptionGroup"("storeId");

-- CreateIndex
CREATE INDEX "Option_groupId_idx" ON "Option"("groupId");

-- CreateIndex
CREATE INDEX "Option_storeId_idx" ON "Option"("storeId");

-- CreateIndex
CREATE INDEX "Tab_storeId_status_idx" ON "Tab"("storeId", "status");

-- CreateIndex
CREATE INDEX "Tab_tableId_status_idx" ON "Tab"("tableId", "status");

-- CreateIndex
CREATE INDEX "Order_storeId_createdAt_idx" ON "Order"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_source_idx" ON "Order"("source");

-- CreateIndex
CREATE INDEX "Order_tabId_idx" ON "Order"("tabId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_itemId_idx" ON "OrderItem"("itemId");

-- CreateIndex
CREATE INDEX "OrderItemOption_orderItemId_idx" ON "OrderItemOption"("orderItemId");

-- CreateIndex
CREATE INDEX "OrderItemOption_optionId_idx" ON "OrderItemOption"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "VoidRequest_orderId_key" ON "VoidRequest"("orderId");

-- CreateIndex
CREATE INDEX "MenuBanner_storeId_idx" ON "MenuBanner"("storeId");

-- CreateIndex
CREATE INDEX "MenuBanner_isActive_idx" ON "MenuBanner"("isActive");

-- CreateIndex
CREATE INDEX "MenuBanner_sort_idx" ON "MenuBanner"("sort");

-- CreateIndex
CREATE INDEX "RegisterSession_storeId_status_idx" ON "RegisterSession"("storeId", "status");

-- CreateIndex
CREATE INDEX "RegisterSession_openedAt_idx" ON "RegisterSession"("openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_orderId_key" ON "Sale"("orderId");

-- CreateIndex
CREATE INDEX "Sale_storeId_createdAt_idx" ON "Sale"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "Sale_registerSessionId_idx" ON "Sale"("registerSessionId");

-- CreateIndex
CREATE INDEX "Sale_orderId_idx" ON "Sale"("orderId");

-- CreateIndex
CREATE INDEX "Sale_tableId_idx" ON "Sale"("tableId");

-- CreateIndex
CREATE INDEX "Sale_tabId_idx" ON "Sale"("tabId");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_storeId_saleNo_key" ON "Sale"("storeId", "saleNo");

-- CreateIndex
CREATE INDEX "SaleLineItem_saleId_idx" ON "SaleLineItem"("saleId");

-- CreateIndex
CREATE INDEX "SaleLineItem_itemId_idx" ON "SaleLineItem"("itemId");

-- CreateIndex
CREATE INDEX "SalePayment_saleId_idx" ON "SalePayment"("saleId");

-- CreateIndex
CREATE INDEX "SalePayment_method_idx" ON "SalePayment"("method");

-- CreateIndex
CREATE INDEX "AuditLog_storeId_createdAt_idx" ON "AuditLog"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
