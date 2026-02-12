-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "job_id" INTEGER NOT NULL DEFAULT 1;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
