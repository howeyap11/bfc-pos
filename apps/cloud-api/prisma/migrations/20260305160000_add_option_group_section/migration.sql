-- CreateTable
CREATE TABLE "MenuOptionGroupSection" (
    "id" TEXT NOT NULL,
    "optionGroupId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isDeletable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MenuOptionGroupSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MenuOptionGroupSection_optionGroupId_key_key" ON "MenuOptionGroupSection"("optionGroupId", "key");

-- CreateIndex
CREATE INDEX "MenuOptionGroupSection_optionGroupId_idx" ON "MenuOptionGroupSection"("optionGroupId");

-- AddForeignKey
ALTER TABLE "MenuOptionGroupSection" ADD CONSTRAINT "MenuOptionGroupSection_optionGroupId_fkey" FOREIGN KEY ("optionGroupId") REFERENCES "MenuOptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
