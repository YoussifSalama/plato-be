-- AlterTable
ALTER TABLE "Resume" ADD COLUMN     "auto_denied" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "auto_invited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "auto_shortlisted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Invitation" (
    "id" SERIAL NOT NULL,
    "to_id" INTEGER NOT NULL,
    "from_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitationToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "invitation_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvitationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_to_id_key" ON "Invitation"("to_id");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_to_id_fkey" FOREIGN KEY ("to_id") REFERENCES "Resume"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_from_id_fkey" FOREIGN KEY ("from_id") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationToken" ADD CONSTRAINT "InvitationToken_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "Invitation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
