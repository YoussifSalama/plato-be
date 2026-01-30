-- CreateTable
CREATE TABLE "ResumeProcessingBatch" (
    "id" SERIAL NOT NULL,
    "aiMeta" JSONB,
    "fileLinkOnLocale" TEXT NOT NULL,
    "fileToken" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeProcessingBatch_pkey" PRIMARY KEY ("id")
);
