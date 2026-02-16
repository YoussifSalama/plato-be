/*
  Warnings:

  - Made the column `agency_id` on table `InterviewSession` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "InterviewSession" DROP CONSTRAINT "InterviewSession_agency_id_fkey";

-- AlterTable
ALTER TABLE "InterviewSession" ALTER COLUMN "agency_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
