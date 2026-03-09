-- Data migration: convert flat AddOn/Substitute to group-based architecture
-- Creates fallback groups "Default Add-ons" and "Default Substitutes", migrates existing data

-- 1. AddOn migration: create "Default Add-ons" group and AddOnOptions from flat AddOn
INSERT INTO "AddOnGroup" ("id", "name", "isActive", "sortOrder", "createdAt", "updatedAt")
SELECT 
  'legacy_addon_group_001',
  'Default Add-ons',
  true,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "AddOn" LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM "AddOnGroup" WHERE "id" = 'legacy_addon_group_001');

-- Create AddOnOption for each existing AddOn (under legacy group)
INSERT INTO "AddOnOption" ("id", "groupId", "name", "priceCents", "isActive", "sortOrder", "createdAt", "updatedAt")
SELECT 
  "AddOn"."id" || '_opt',
  'legacy_addon_group_001',
  "AddOn"."name",
  "AddOn"."priceCents",
  "AddOn"."isActive",
  "AddOn"."sortOrder",
  "AddOn"."createdAt",
  "AddOn"."updatedAt"
FROM "AddOn"
WHERE EXISTS (SELECT 1 FROM "AddOnGroup" WHERE "id" = 'legacy_addon_group_001')
  AND NOT EXISTS (SELECT 1 FROM "AddOnOption" WHERE "id" = "AddOn"."id" || '_opt');

-- Migrate AddOnRecipeLine -> AddOnOptionRecipeLine (optionId = AddOn.id || '_opt')
INSERT INTO "AddOnOptionRecipeLine" ("id", "optionId", "ingredientId", "qtyPerItem", "unitCode", "createdAt", "updatedAt")
SELECT 
  "AddOnRecipeLine"."id" || '_opt',
  "AddOnRecipeLine"."addOnId" || '_opt',
  "AddOnRecipeLine"."ingredientId",
  "AddOnRecipeLine"."qtyPerItem",
  "AddOnRecipeLine"."unitCode",
  "AddOnRecipeLine"."createdAt",
  "AddOnRecipeLine"."updatedAt"
FROM "AddOnRecipeLine"
WHERE EXISTS (SELECT 1 FROM "AddOnOption" WHERE "id" = "AddOnRecipeLine"."addOnId" || '_opt')
  AND NOT EXISTS (SELECT 1 FROM "AddOnOptionRecipeLine" WHERE "id" = "AddOnRecipeLine"."id" || '_opt');

-- Migrate MenuItemAddOn -> MenuItemAddOnGroup (one group per distinct itemId that had add-ons)
INSERT INTO "MenuItemAddOnGroup" ("id", "itemId", "groupId")
SELECT 'legacy_maog_' || d."itemId", d."itemId", 'legacy_addon_group_001'
FROM (SELECT DISTINCT "itemId" FROM "MenuItemAddOn") d
WHERE EXISTS (SELECT 1 FROM "AddOnGroup" WHERE "id" = 'legacy_addon_group_001')
  AND NOT EXISTS (SELECT 1 FROM "MenuItemAddOnGroup" m WHERE m."itemId" = d."itemId" AND m."groupId" = 'legacy_addon_group_001');

-- 2. Substitute migration: create "Default Substitutes" group and SubstituteOptions from flat Substitute
INSERT INTO "SubstituteGroup" ("id", "name", "isActive", "sortOrder", "createdAt", "updatedAt")
SELECT 
  'legacy_substitute_group_001',
  'Default Substitutes',
  true,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE EXISTS (SELECT 1 FROM "Substitute" LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM "SubstituteGroup" WHERE "id" = 'legacy_substitute_group_001');

-- Create SubstituteOption for each existing Substitute
INSERT INTO "SubstituteOption" ("id", "groupId", "name", "priceCents", "isActive", "sortOrder", "createdAt", "updatedAt")
SELECT 
  "Substitute"."id" || '_opt',
  'legacy_substitute_group_001',
  "Substitute"."name",
  "Substitute"."priceCents",
  "Substitute"."isActive",
  "Substitute"."sortOrder",
  "Substitute"."createdAt",
  "Substitute"."updatedAt"
FROM "Substitute"
WHERE EXISTS (SELECT 1 FROM "SubstituteGroup" WHERE "id" = 'legacy_substitute_group_001')
  AND NOT EXISTS (SELECT 1 FROM "SubstituteOption" WHERE "id" = "Substitute"."id" || '_opt');

-- Migrate SubstituteRecipeLine -> SubstituteOptionRecipeLine
INSERT INTO "SubstituteOptionRecipeLine" ("id", "optionId", "ingredientId", "qtyPerItem", "unitCode", "createdAt", "updatedAt")
SELECT 
  "SubstituteRecipeLine"."id" || '_opt',
  "SubstituteRecipeLine"."substituteId" || '_opt',
  "SubstituteRecipeLine"."ingredientId",
  "SubstituteRecipeLine"."qtyPerItem",
  "SubstituteRecipeLine"."unitCode",
  "SubstituteRecipeLine"."createdAt",
  "SubstituteRecipeLine"."updatedAt"
FROM "SubstituteRecipeLine"
WHERE EXISTS (SELECT 1 FROM "SubstituteOption" WHERE "id" = "SubstituteRecipeLine"."substituteId" || '_opt')
  AND NOT EXISTS (SELECT 1 FROM "SubstituteOptionRecipeLine" WHERE "id" = "SubstituteRecipeLine"."id" || '_opt');

-- Migrate MenuItemSubstitute -> MenuItemSubstituteGroup
INSERT INTO "MenuItemSubstituteGroup" ("id", "itemId", "groupId")
SELECT 'legacy_msg_' || d."itemId", d."itemId", 'legacy_substitute_group_001'
FROM (SELECT DISTINCT "itemId" FROM "MenuItemSubstitute") d
WHERE EXISTS (SELECT 1 FROM "SubstituteGroup" WHERE "id" = 'legacy_substitute_group_001')
  AND NOT EXISTS (SELECT 1 FROM "MenuItemSubstituteGroup" m WHERE m."itemId" = d."itemId" AND m."groupId" = 'legacy_substitute_group_001');

-- Migrate MenuItem.defaultSubstituteId -> defaultSubstituteOptionId (Substitute.id -> SubstituteOption.id = Substitute.id || '_opt')
UPDATE "MenuItem"
SET "defaultSubstituteOptionId" = "defaultSubstituteId" || '_opt'
WHERE "defaultSubstituteId" IS NOT NULL
  AND EXISTS (SELECT 1 FROM "SubstituteOption" WHERE "id" = "MenuItem"."defaultSubstituteId" || '_opt');
