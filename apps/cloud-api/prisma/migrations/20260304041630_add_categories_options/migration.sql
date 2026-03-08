-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "subCategoryId" TEXT;

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuOptionGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "multi" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MenuOptionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuOption" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceDelta" INTEGER NOT NULL DEFAULT 0,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "MenuOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemOptionGroup" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "MenuItemOptionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "SubCategory_categoryId_idx" ON "SubCategory"("categoryId");

-- CreateIndex
CREATE INDEX "MenuOption_groupId_idx" ON "MenuOption"("groupId");

-- CreateIndex
CREATE INDEX "MenuItemOptionGroup_itemId_idx" ON "MenuItemOptionGroup"("itemId");

-- CreateIndex
CREATE INDEX "MenuItemOptionGroup_groupId_idx" ON "MenuItemOptionGroup"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemOptionGroup_itemId_groupId_key" ON "MenuItemOptionGroup"("itemId", "groupId");

-- CreateIndex
CREATE INDEX "MenuItem_categoryId_idx" ON "MenuItem"("categoryId");

-- CreateIndex
CREATE INDEX "MenuItem_subCategoryId_idx" ON "MenuItem"("subCategoryId");

-- AddForeignKey
ALTER TABLE "SubCategory" ADD CONSTRAINT "SubCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "SubCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuOption" ADD CONSTRAINT "MenuOption_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MenuOptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemOptionGroup" ADD CONSTRAINT "MenuItemOptionGroup_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemOptionGroup" ADD CONSTRAINT "MenuItemOptionGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MenuOptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
