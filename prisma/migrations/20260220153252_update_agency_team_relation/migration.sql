/*
  Warnings:

  - You are about to drop the column `agency_id` on the `Team` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[team_id]` on the table `Agency` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[account_id]` on the table `TeamMember` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Team" DROP CONSTRAINT "Team_agency_id_fkey";

-- AlterTable
ALTER TABLE "Agency" ADD COLUMN     "team_id" INTEGER;

-- AlterTable
ALTER TABLE "Team" DROP COLUMN "agency_id";

-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN     "account_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Agency_team_id_key" ON "Agency"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_account_id_key" ON "TeamMember"("account_id");

-- AddForeignKey
ALTER TABLE "Agency" ADD CONSTRAINT "Agency_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
