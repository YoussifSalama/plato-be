-- Ensure Resume.parsed exists (fix drift)
ALTER TABLE "Resume" ADD COLUMN IF NOT EXISTS "parsed" TEXT;

