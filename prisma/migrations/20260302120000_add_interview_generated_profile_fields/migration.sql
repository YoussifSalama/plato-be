-- CreateEnum
CREATE TYPE "InterviewGeneratedProfileStatus" AS ENUM ('not_started', 'queued', 'processing', 'completed', 'failed');

-- AlterTable
ALTER TABLE "InterviewSession"
ADD COLUMN "generated_profile_status" "InterviewGeneratedProfileStatus" NOT NULL DEFAULT 'not_started',
ADD COLUMN "generated_profile" JSONB,
ADD COLUMN "generated_profile_error" TEXT,
ADD COLUMN "generated_profile_generated_at" TIMESTAMP(3);
