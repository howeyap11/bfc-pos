-- CreateTable
CREATE TABLE "MenuSettingGroup" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isDeletable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuSettingGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuSize" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuSize_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MenuSettingGroup_key_key" ON "MenuSettingGroup"("key");

-- CreateIndex
CREATE INDEX "MenuSize_groupId_idx" ON "MenuSize"("groupId");

-- AddForeignKey
ALTER TABLE "MenuSize" ADD CONSTRAINT "MenuSize_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MenuSettingGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
