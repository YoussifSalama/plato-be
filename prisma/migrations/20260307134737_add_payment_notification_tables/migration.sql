-- CreateEnum
CREATE TYPE "CandidateInboxStatus" AS ENUM ('unread', 'read', 'archived');

-- CreateEnum
CREATE TYPE "CandidateInboxType" AS ENUM ('application', 'interview', 'account');

-- AlterTable
ALTER TABLE "AgencySubscription" ADD COLUMN     "stripe_customer_id" TEXT,
ADD COLUMN     "stripe_subscription_id" TEXT,
ADD COLUMN     "trial_end_date" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Job" ALTER COLUMN "auto_deactivate_at" SET DATA TYPE DATE;

-- CreateTable
CREATE TABLE "CandidateSavedJob" (
    "id" SERIAL NOT NULL,
    "candidate_id" INTEGER NOT NULL,
    "job_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateSavedJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateInbox" (
    "id" SERIAL NOT NULL,
    "type" "CandidateInboxType" NOT NULL,
    "status" "CandidateInboxStatus" NOT NULL DEFAULT 'unread',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "candidate_id" INTEGER NOT NULL,
    "job_id" INTEGER,
    "interview_session_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateInbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CandidateSavedJob_candidate_id_job_id_key" ON "CandidateSavedJob"("candidate_id", "job_id");

-- AddForeignKey
ALTER TABLE "CandidateSavedJob" ADD CONSTRAINT "CandidateSavedJob_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateSavedJob" ADD CONSTRAINT "CandidateSavedJob_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateInbox" ADD CONSTRAINT "CandidateInbox_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateInbox" ADD CONSTRAINT "CandidateInbox_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateInbox" ADD CONSTRAINT "CandidateInbox_interview_session_id_fkey" FOREIGN KEY ("interview_session_id") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
