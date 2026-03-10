-- CreateTable SubstitutePrice: pricing by size and temperature/mode for substitute milk types
CREATE TABLE "SubstitutePrice" (
    "id" TEXT NOT NULL,
    "substituteId" TEXT NOT NULL,
    "sizeId" TEXT NOT NULL,
    "mode" "DrinkMode" NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubstitutePrice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubstitutePrice_substituteId_sizeId_mode_key" ON "SubstitutePrice"("substituteId", "sizeId", "mode");
CREATE INDEX "SubstitutePrice_substituteId_idx" ON "SubstitutePrice"("substituteId");
CREATE INDEX "SubstitutePrice_sizeId_idx" ON "SubstitutePrice"("sizeId");

ALTER TABLE "SubstitutePrice" ADD CONSTRAINT "SubstitutePrice_substituteId_fkey" FOREIGN KEY ("substituteId") REFERENCES "Substitute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SubstitutePrice" ADD CONSTRAINT "SubstitutePrice_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "MenuSize"("id") ON DELETE CASCADE ON UPDATE CASCADE;
