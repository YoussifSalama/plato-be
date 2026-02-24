/*
  Warnings:

  - A unique constraint covering the columns `[google_id]` on the table `Candidate` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "auth_provider" TEXT,
ADD COLUMN     "google_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_google_id_key" ON "Candidate"("google_id");
