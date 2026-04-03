-- Staff groups: foundation for organizing staff; future SOP/schedule assignment may reference StaffGroup.id
CREATE TABLE "StaffGroup" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL DEFAULT 'store_1',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffGroup_storeId_name_key" ON "StaffGroup"("storeId", "name");
CREATE INDEX "StaffGroup_storeId_idx" ON "StaffGroup"("storeId");

ALTER TABLE "Staff" ADD COLUMN "groupId" TEXT;

CREATE INDEX "Staff_groupId_idx" ON "Staff"("groupId");

ALTER TABLE "Staff" ADD CONSTRAINT "Staff_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "StaffGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
