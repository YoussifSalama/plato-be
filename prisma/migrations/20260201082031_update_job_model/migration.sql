/*
  Warnings:

  - The `soft_skills` column on the `Job` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "company_overview" TEXT,
ADD COLUMN     "job_benefits" TEXT,
ADD COLUMN     "nice_to_have" TEXT,
ADD COLUMN     "responsibilities" TEXT,
ADD COLUMN     "role_overview" TEXT,
ADD COLUMN     "what_we_offer" TEXT,
DROP COLUMN "soft_skills",
ADD COLUMN     "soft_skills" TEXT[];
