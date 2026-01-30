/*
  Warnings:

  - A unique constraint covering the columns `[batchId]` on the table `ResumeProcessingBatch` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ResumeProcessingBatch_batchId_key" ON "ResumeProcessingBatch"("batchId");
