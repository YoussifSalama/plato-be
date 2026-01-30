/*
  Warnings:

  - You are about to drop the column `fileToken` on the `ResumeProcessingBatch` table. All the data in the column will be lost.
  - Added the required column `fileId` to the `ResumeProcessingBatch` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ResumeProcessingBatch" DROP COLUMN "fileToken",
ADD COLUMN     "fileId" TEXT NOT NULL;
