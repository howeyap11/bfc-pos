-- Add lastAttemptAt for retry observability (when last attempt was made)
ALTER TABLE "LocalOutbox" ADD COLUMN "lastAttemptAt" DATETIME;
