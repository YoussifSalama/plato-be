-- CreateEnum
CREATE TYPE "ProfileExperienceType" AS ENUM ('remote', 'hybrid', 'on_site', 'full_time', 'part_time', 'contract', 'internship', 'freelance', 'temporary', 'volunteer');

-- CreateTable
CREATE TABLE "Profile" (
    "id" SERIAL NOT NULL,
    "avatar" TEXT,
    "candidate_id" INTEGER NOT NULL,
    "headline" TEXT,
    "summary" TEXT,
    "location" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experience" (
    "id" SERIAL NOT NULL,
    "profile_id" INTEGER NOT NULL,
    "company_name" TEXT NOT NULL,
    "from" TIMESTAMP(3),
    "to" TIMESTAMP(3),
    "current" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL,
    "description" TEXT,
    "field" TEXT NOT NULL,
    "type" "ProfileExperienceType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" SERIAL NOT NULL,
    "profile_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialLinks" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "profile_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialLinks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewSession" (
    "id" SERIAL NOT NULL,
    "invitation_token_id" INTEGER NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'ar',
    "status" TEXT NOT NULL DEFAULT 'active',
    "qa_log" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_candidate_id_key" ON "Profile"("candidate_id");

-- CreateIndex
CREATE INDEX "SocialLinks_profile_id_idx" ON "SocialLinks"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "SocialLinks_profile_id_key_key" ON "SocialLinks"("profile_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewSession_invitation_token_id_key" ON "InterviewSession"("invitation_token_id");

-- CreateIndex
CREATE INDEX "InterviewSession_invitation_token_id_idx" ON "InterviewSession"("invitation_token_id");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialLinks" ADD CONSTRAINT "SocialLinks_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_invitation_token_id_fkey" FOREIGN KEY ("invitation_token_id") REFERENCES "InvitationToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;
