/*
  Warnings:

  - A unique constraint covering the columns `[fileId]` on the table `ResumeProcessingBatch` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ResumeAiBatchStatus" AS ENUM ('completed', 'cancelled', 'expired', 'failed', 'pending');

-- AlterTable
ALTER TABLE "ResumeProcessingBatch" ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "outputLinkOnLocale" TEXT,
ADD COLUMN     "status" "ResumeAiBatchStatus";

-- CreateIndex
CREATE UNIQUE INDEX "ResumeProcessingBatch_fileId_key" ON "ResumeProcessingBatch"("fileId");
