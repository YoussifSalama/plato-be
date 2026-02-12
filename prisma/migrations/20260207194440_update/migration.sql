-- CreateEnum
CREATE TYPE "InvitationTokenStatus" AS ENUM ('valid', 'in_use', 'invalid');

-- AlterTable
ALTER TABLE "InvitationToken" ADD COLUMN     "status" "InvitationTokenStatus" NOT NULL DEFAULT 'valid';
