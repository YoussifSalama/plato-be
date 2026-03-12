-- CreateEnum
CREATE TYPE "FeedbackFrom" AS ENUM ('agency', 'candidate');

-- CreateEnum
CREATE TYPE "FeedbackDecision" AS ENUM ('shortlist', 'reject', 'advance_offline');

-- CreateTable
CREATE TABLE "InterviewFeedback" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "from" "FeedbackFrom" NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "decision" "FeedbackDecision",
    "proposed_date_range_start" TIMESTAMP(3),
    "proposed_date_range_end" TIMESTAMP(3),
    "selected_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InterviewFeedback_session_id_from_key" ON "InterviewFeedback"("session_id", "from");

-- CreateIndex
CREATE INDEX "InterviewFeedback_session_id_idx" ON "InterviewFeedback"("session_id");

-- AddForeignKey
ALTER TABLE "InterviewFeedback" ADD CONSTRAINT "InterviewFeedback_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
