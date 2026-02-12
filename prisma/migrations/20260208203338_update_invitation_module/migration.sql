/*
  Warnings:

  - A unique constraint covering the columns `[invitation_token_id]` on the table `InterviewResources` will be added. If there are existing duplicate values, this will fail.
  - Made the column `invitation_token_id` on table `InterviewResources` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "InterviewResources" DROP CONSTRAINT "InterviewResources_invitation_token_id_fkey";

-- AlterTable
ALTER TABLE "InterviewResources" ALTER COLUMN "invitation_token_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "InterviewResources_invitation_token_id_key" ON "InterviewResources"("invitation_token_id");

-- AddForeignKey
ALTER TABLE "InterviewResources" ADD CONSTRAINT "InterviewResources_invitation_token_id_fkey" FOREIGN KEY ("invitation_token_id") REFERENCES "InvitationToken"("id") ON DELETE CASCADE ON UPDATE CASCADE;
