/*
  Warnings:

  - You are about to drop the column `fileType` on the `Resume` table. All the data in the column will be lost.
  - You are about to drop the column `seniorityLevel` on the `ResumeAnalysis` table. All the data in the column will be lost.
  - You are about to drop the column `aiMeta` on the `ResumeProcessingBatch` table. All the data in the column will be lost.
  - You are about to drop the column `batchId` on the `ResumeProcessingBatch` table. All the data in the column will be lost.
  - You are about to drop the column `fileId` on the `ResumeProcessingBatch` table. All the data in the column will be lost.
  - You are about to drop the column `fileLinkOnLocale` on the `ResumeProcessingBatch` table. All the data in the column will be lost.
  - You are about to drop the column `outputLinkOnLocale` on the `ResumeProcessingBatch` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[input_file_id]` on the table `ResumeProcessingBatch` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[batch_id]` on the table `ResumeProcessingBatch` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `file_type` to the `Resume` table without a default value. This is not possible if the table is not empty.
  - Added the required column `seniority_level` to the `ResumeAnalysis` table without a default value. This is not possible if the table is not empty.
  - Added the required column `input_file_id` to the `ResumeProcessingBatch` table without a default value. This is not possible if the table is not empty.
  - Added the required column `input_file_link` to the `ResumeProcessingBatch` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ResumeProcessingBatch_batchId_key";

-- DropIndex
DROP INDEX "ResumeProcessingBatch_fileId_key";

-- AlterTable
ALTER TABLE "Resume" DROP COLUMN "fileType",
ADD COLUMN     "file_type" "ResumeFileTypes" NOT NULL;

-- AlterTable
ALTER TABLE "ResumeAnalysis" DROP COLUMN "seniorityLevel",
ADD COLUMN     "seniority_level" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ResumeProcessingBatch" DROP COLUMN "aiMeta",
DROP COLUMN "batchId",
DROP COLUMN "fileId",
DROP COLUMN "fileLinkOnLocale",
DROP COLUMN "outputLinkOnLocale",
ADD COLUMN     "ai_meta" JSONB,
ADD COLUMN     "batch_id" TEXT,
ADD COLUMN     "input_file_id" TEXT NOT NULL,
ADD COLUMN     "input_file_link" TEXT NOT NULL,
ADD COLUMN     "output_file_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ResumeProcessingBatch_input_file_id_key" ON "ResumeProcessingBatch"("input_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeProcessingBatch_batch_id_key" ON "ResumeProcessingBatch"("batch_id");
