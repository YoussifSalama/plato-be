-- CreateTable
CREATE TABLE "Candidate" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "candidate_name" TEXT,
    "f_name" TEXT NOT NULL,
    "l_name" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "credential_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateToken" (
    "id" SERIAL NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "candidate_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateCredential" (
    "id" SERIAL NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_email_key" ON "Candidate"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_credential_id_key" ON "Candidate"("credential_id");

-- AddForeignKey
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "CandidateCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateToken" ADD CONSTRAINT "CandidateToken_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
