/*
  Warnings:

  - You are about to drop the column `email` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Team` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Team` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[organization_id]` on the table `Agency` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Team_email_key";

-- DropIndex
DROP INDEX "Team_phone_key";

-- AlterTable
ALTER TABLE "Agency" ADD COLUMN     "organization_id" TEXT;

-- AlterTable
ALTER TABLE "Team" DROP COLUMN "email",
DROP COLUMN "name",
DROP COLUMN "phone";

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "team_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamInvitation" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "agency_id" INTEGER NOT NULL,
    "member_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_email_key" ON "TeamMember"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_phone_key" ON "TeamMember"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "TeamInvitation_code_key" ON "TeamInvitation"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Agency_organization_id_key" ON "Agency"("organization_id");

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamInvitation" ADD CONSTRAINT "TeamInvitation_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamInvitation" ADD CONSTRAINT "TeamInvitation_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "TeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
