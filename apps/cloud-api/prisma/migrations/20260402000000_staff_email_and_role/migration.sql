-- Add optional email to Staff
ALTER TABLE "Staff" ADD COLUMN "email" TEXT;

CREATE INDEX "Staff_email_idx" ON "Staff"("email");
