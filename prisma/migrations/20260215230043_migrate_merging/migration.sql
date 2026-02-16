-- AlterTable
ALTER TABLE "InterviewSession" ADD COLUMN     "agency_id" INTEGER;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "resume_link" TEXT,
ADD COLUMN     "resume_parsed" JSONB;

-- CreateTable
CREATE TABLE "JobMatch" (
    "id" SERIAL NOT NULL,
    "candidate_id" INTEGER NOT NULL,
    "job_id" INTEGER NOT NULL,
    "match_score" INTEGER NOT NULL,
    "ai_reasoning" TEXT,
    "matched_skills" TEXT[],
    "missing_skills" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobMatch_candidate_id_idx" ON "JobMatch"("candidate_id");

-- CreateIndex
CREATE INDEX "JobMatch_job_id_idx" ON "JobMatch"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "JobMatch_candidate_id_job_id_key" ON "JobMatch"("candidate_id", "job_id");

-- CreateIndex
CREATE INDEX "InterviewSession_agency_id_idx" ON "InterviewSession"("agency_id");

-- AddForeignKey
ALTER TABLE "JobMatch" ADD CONSTRAINT "JobMatch_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobMatch" ADD CONSTRAINT "JobMatch_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
