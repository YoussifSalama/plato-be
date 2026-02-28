-- Add mandatory auto-deactivate datetime for jobs.
ALTER TABLE "Job"
ADD COLUMN "auto_deactivate_at" TIMESTAMP(3);

-- Backfill existing jobs to keep them active by default for one year.
UPDATE "Job"
SET "auto_deactivate_at" = NOW() + INTERVAL '365 days'
WHERE "auto_deactivate_at" IS NULL;

ALTER TABLE "Job"
ALTER COLUMN "auto_deactivate_at" SET NOT NULL;
