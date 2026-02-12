/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `Candidate` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[invitation_id]` on the table `Candidate` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "invitation_id" INTEGER,
ADD COLUMN     "invited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_phone_key" ON "Candidate"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_invitation_id_key" ON "Candidate"("invitation_id");

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "Invitation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
