-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InboxType" ADD VALUE 'application';
ALTER TYPE "InboxType" ADD VALUE 'interview';

-- AlterTable
ALTER TABLE "Inbox" ADD COLUMN     "interview_session_id" INTEGER,
ADD COLUMN     "job_application_id" INTEGER;

-- AddForeignKey
ALTER TABLE "Inbox" ADD CONSTRAINT "Inbox_job_application_id_fkey" FOREIGN KEY ("job_application_id") REFERENCES "JobApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inbox" ADD CONSTRAINT "Inbox_interview_session_id_fkey" FOREIGN KEY ("interview_session_id") REFERENCES "InterviewSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
