-- AlterTable
ALTER TABLE "InvitationToken" ADD COLUMN     "candidate_id" INTEGER;

-- AddForeignKey
ALTER TABLE "InvitationToken" ADD CONSTRAINT "InvitationToken_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
