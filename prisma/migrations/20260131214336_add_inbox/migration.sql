-- CreateEnum
CREATE TYPE "InboxType" AS ENUM ('batch');

-- CreateEnum
CREATE TYPE "InboxStatus" AS ENUM ('unread', 'read', 'archived');

-- CreateEnum
CREATE TYPE "InboxSeverity" AS ENUM ('info', 'warning', 'error');

-- CreateTable
CREATE TABLE "Inbox" (
    "id" SERIAL NOT NULL,
    "type" "InboxType" NOT NULL,
    "status" "InboxStatus" NOT NULL,
    "severity" "InboxSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "agency_id" INTEGER NOT NULL,
    "job_id" INTEGER,
    "batch_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inbox_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Inbox" ADD CONSTRAINT "Inbox_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inbox" ADD CONSTRAINT "Inbox_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inbox" ADD CONSTRAINT "Inbox_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "ResumeProcessingBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
