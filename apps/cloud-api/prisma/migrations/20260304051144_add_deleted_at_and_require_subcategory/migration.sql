-- Add deletedAt to Category and SubCategory
ALTER TABLE "Category" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "SubCategory" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Create placeholder for items with null subCategoryId
INSERT INTO "Category" ("id", "name", "slug", "sortOrder", "createdAt", "updatedAt")
SELECT 'cluncategorizedcat001', 'Uncategorized', 'uncategorized', 9999, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Category" WHERE "slug" = 'uncategorized');

INSERT INTO "SubCategory" ("id", "name", "categoryId", "sortOrder", "createdAt", "updatedAt")
SELECT 'cluncategorizedsub001', 'Uncategorized', COALESCE((SELECT "id" FROM "Category" WHERE "slug" = 'uncategorized' LIMIT 1), 'cluncategorizedcat001'), 9999, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "SubCategory" WHERE "id" = 'cluncategorizedsub001');

UPDATE "MenuItem" SET "subCategoryId" = 'cluncategorizedsub001' WHERE "subCategoryId" IS NULL;

-- DropForeignKey
ALTER TABLE "MenuItem" DROP CONSTRAINT "MenuItem_subCategoryId_fkey";

-- AlterTable - make subCategoryId required
ALTER TABLE "MenuItem" ALTER COLUMN "subCategoryId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "SubCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
