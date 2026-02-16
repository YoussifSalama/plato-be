/*
  Warnings:

  - The `status` column on the `InterviewSession` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `resume_link` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `resume_parsed` on the `Profile` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "InterviewSessionStatus" AS ENUM ('completed', 'active', 'inactive');

-- AlterTable
ALTER TABLE "InterviewSession" DROP COLUMN "status",
ADD COLUMN     "status" "InterviewSessionStatus" NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "resume_link",
DROP COLUMN "resume_parsed";
