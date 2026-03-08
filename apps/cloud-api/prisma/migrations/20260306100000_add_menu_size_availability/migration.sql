-- CreateTable
CREATE TABLE "MenuSizeAvailability" (
    "id" TEXT NOT NULL,
    "mode" "DrinkMode" NOT NULL,
    "sizeId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuSizeAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MenuSizeAvailability_mode_sizeId_key" ON "MenuSizeAvailability"("mode", "sizeId");

-- CreateIndex
CREATE INDEX "MenuSizeAvailability_mode_idx" ON "MenuSizeAvailability"("mode");

-- CreateIndex
CREATE INDEX "MenuSizeAvailability_sizeId_idx" ON "MenuSizeAvailability"("sizeId");

-- AddForeignKey
ALTER TABLE "MenuSizeAvailability" ADD CONSTRAINT "MenuSizeAvailability_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "MenuSize"("id") ON DELETE CASCADE ON UPDATE CASCADE;
