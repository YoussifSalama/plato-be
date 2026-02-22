-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "updated_by" INTEGER;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "updated_by" INTEGER;

-- AlterTable
ALTER TABLE "JobAiPrompt" ADD COLUMN     "updated_by" INTEGER;

-- AlterTable
ALTER TABLE "JobMatch" ADD COLUMN     "updated_by" INTEGER;

-- AlterTable
ALTER TABLE "Resume" ADD COLUMN     "updated_by" INTEGER;

-- AlterTable
ALTER TABLE "ResumeAnalysis" ADD COLUMN     "updated_by" INTEGER;

-- AddForeignKey
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeAnalysis" ADD CONSTRAINT "ResumeAnalysis_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAiPrompt" ADD CONSTRAINT "JobAiPrompt_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobMatch" ADD CONSTRAINT "JobMatch_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
