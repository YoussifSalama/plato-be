-- CreateTable
CREATE TABLE "InterviewResources" (
    "id" SERIAL NOT NULL,
    "agency_id" INTEGER NOT NULL,
    "job_id" INTEGER NOT NULL,
    "resume_id" INTEGER NOT NULL,
    "invitation_token_id" INTEGER,
    "agency_snapshot" JSONB NOT NULL,
    "job_snapshot" JSONB NOT NULL,
    "resume_snapshot" JSONB NOT NULL,
    "prepared_questions" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewResources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InterviewResources_agency_id_idx" ON "InterviewResources"("agency_id");

-- CreateIndex
CREATE INDEX "InterviewResources_job_id_idx" ON "InterviewResources"("job_id");

-- CreateIndex
CREATE INDEX "InterviewResources_resume_id_idx" ON "InterviewResources"("resume_id");

-- CreateIndex
CREATE INDEX "InterviewResources_invitation_token_id_idx" ON "InterviewResources"("invitation_token_id");

-- AddForeignKey
ALTER TABLE "InterviewResources" ADD CONSTRAINT "InterviewResources_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewResources" ADD CONSTRAINT "InterviewResources_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewResources" ADD CONSTRAINT "InterviewResources_resume_id_fkey" FOREIGN KEY ("resume_id") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewResources" ADD CONSTRAINT "InterviewResources_invitation_token_id_fkey" FOREIGN KEY ("invitation_token_id") REFERENCES "InvitationToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;
