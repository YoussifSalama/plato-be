/*
  Warnings:

  - Changed the type of `recommendation` on the `ResumeAnalysis` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ResumeAnalysisRecommendation" AS ENUM ('recommended', 'not_recommended', 'consider', 'highly_recommended');

-- AlterTable
ALTER TABLE "ResumeAnalysis"
ALTER COLUMN "recommendation" TYPE "ResumeAnalysisRecommendation"
USING (
  CASE
    WHEN "recommendation" IS NULL THEN 'consider'
    WHEN lower("recommendation") IN ('recommended', 'recommend') THEN 'recommended'
    WHEN lower("recommendation") IN ('not recommended', 'not_recommended', 'not-recommended') THEN 'not_recommended'
    WHEN lower("recommendation") IN ('consider', 'considered') THEN 'consider'
    WHEN lower("recommendation") IN ('highly recommended', 'highly_recommended', 'highly-recommended') THEN 'highly_recommended'
    ELSE 'consider'
  END
)::"ResumeAnalysisRecommendation";
