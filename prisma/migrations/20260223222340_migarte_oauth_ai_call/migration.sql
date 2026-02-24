/*
  Warnings:

  - A unique constraint covering the columns `[google_id]` on the table `Account` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "auth_provider" TEXT,
ADD COLUMN     "google_id" TEXT,
ADD COLUMN     "profile_image_url" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Account_google_id_key" ON "Account"("google_id");
