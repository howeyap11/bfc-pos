-- CreateTable
CREATE TABLE "DevActionLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "deviceId" TEXT,
    "actionType" TEXT NOT NULL,
    "scope" TEXT,
    "affectedCount" INTEGER,
    "result" TEXT NOT NULL,
    "isProduction" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevActionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DevActionLog_adminId_createdAt_idx" ON "DevActionLog"("adminId", "createdAt");
CREATE INDEX "DevActionLog_createdAt_idx" ON "DevActionLog"("createdAt");
