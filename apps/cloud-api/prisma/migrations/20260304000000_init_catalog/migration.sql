-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogVersion" (
    "id" INTEGER NOT NULL,
    "latestVersion" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CatalogVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "imageUrl" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unitCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeLine" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "qtyPerItem" DECIMAL(20,10) NOT NULL,
    "unitCode" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecipeLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "MenuItem_version_idx" ON "MenuItem"("version");

-- CreateIndex
CREATE INDEX "Ingredient_version_idx" ON "Ingredient"("version");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeLine_menuItemId_ingredientId_key" ON "RecipeLine"("menuItemId", "ingredientId");

-- CreateIndex
CREATE INDEX "RecipeLine_menuItemId_idx" ON "RecipeLine"("menuItemId");

-- CreateIndex
CREATE INDEX "RecipeLine_ingredientId_idx" ON "RecipeLine"("ingredientId");

-- CreateIndex
CREATE INDEX "RecipeLine_version_idx" ON "RecipeLine"("version");

-- AddForeignKey
ALTER TABLE "RecipeLine" ADD CONSTRAINT "RecipeLine_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeLine" ADD CONSTRAINT "RecipeLine_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed CatalogVersion (single row id=1)
INSERT INTO "CatalogVersion" ("id", "latestVersion") VALUES (1, 0);
