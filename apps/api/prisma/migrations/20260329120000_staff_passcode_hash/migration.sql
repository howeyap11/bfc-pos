-- Local Staff: optional scrypt hash synced from cloud (offline PIN verify)
ALTER TABLE "Staff" ADD COLUMN "passcodeHash" TEXT;
