-- Cloud admin portal role (separate from POS Staff.role)
CREATE TYPE "CloudAdminRole" AS ENUM ('ADMIN', 'MANAGER');

ALTER TABLE "AdminUser" ADD COLUMN "role" "CloudAdminRole" NOT NULL DEFAULT 'ADMIN';
