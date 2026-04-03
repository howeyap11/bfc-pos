-- Cloud Staff: hashed PIN synced to POS; legacy plaintext may remain until staff PIN is updated in admin
ALTER TABLE "Staff" ADD COLUMN "passcodeHash" TEXT;
