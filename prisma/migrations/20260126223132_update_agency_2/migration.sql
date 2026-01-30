/*
  Warnings:

  - Added the required column `job_id` to the `Resume` table without a default value. This is not possible if the table is not empty.
  - Added the required column `job_id` to the `ResumeAnalysis` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "JobWorkplaceType" AS ENUM ('on_site', 'remote', 'hybrid');

-- CreateEnum
CREATE TYPE "JobEmploymentType" AS ENUM ('full_time', 'part_time', 'freelance', 'contract', 'internship');

-- CreateEnum
CREATE TYPE "JobIndustry" AS ENUM ('technology', 'marketing', 'education', 'finance', 'legal', 'healthcare', 'retail', 'manufacturing', 'consulting', 'real_estate', 'media', 'government', 'non_profit', 'construction', 'transportation', 'other');

-- CreateEnum
CREATE TYPE "JobSeniorityLevel" AS ENUM ('internship', 'entery_level', 'junior', 'mid_level', 'senior', 'lead');

-- CreateEnum
CREATE TYPE "jobInterviewLanguage" AS ENUM ('no_prefernce', 'arabic', 'english');

-- CreateEnum
CREATE TYPE "JobSalaryCurrency" AS ENUM ('usd', 'egp');

-- CreateEnum
CREATE TYPE "JobSoftSkills" AS ENUM ('communication', 'leadership', 'problem_solving', 'critical_thinking', 'creativity', 'team_work', 'adaptability', 'time_management', 'project_management', 'mentoring', 'public_speaking', 'negotiation', 'conflict_resolution', 'emotional_intelligence', 'strategic_thinking', 'innovation', 'analytical_skills', 'attention_to_detail', 'customer_focus', 'cultural_awareness', 'decision_making', 'collaboration');

-- AlterTable
ALTER TABLE "Agency" ADD COLUMN     "company_industry" TEXT;

-- AlterTable
ALTER TABLE "Resume" ADD COLUMN     "job_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "ResumeAnalysis" ADD COLUMN     "job_id" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Job" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "workplace_type" "JobWorkplaceType" NOT NULL,
    "employment_type" "JobEmploymentType" NOT NULL,
    "seniority_level" "JobSeniorityLevel" NOT NULL,
    "industry" "JobIndustry" NOT NULL,
    "location" TEXT NOT NULL,
    "auto_score_matching_threshold" INTEGER,
    "auto_email_invite_threshold" INTEGER,
    "auto_shortlisted_threshold" INTEGER,
    "auto_denied_threshold" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "salary_currency" "JobSalaryCurrency" NOT NULL,
    "salary_from" DECIMAL(65,30) NOT NULL,
    "salary_to" DECIMAL(65,30) NOT NULL,
    "is_salary_negotiable" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "certifications" TEXT NOT NULL,
    "soft_skills" "JobSoftSkills"[],
    "technical_skills" TEXT[],
    "languages" JSONB[],
    "agency_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeAnalysis" ADD CONSTRAINT "ResumeAnalysis_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
