DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InterviewSessionStatus') THEN
        CREATE TYPE "InterviewSessionStatus" AS ENUM ('completed', 'active', 'inactive', 'cancelled');
    ELSE
        BEGIN
            ALTER TYPE "InterviewSessionStatus" ADD VALUE IF NOT EXISTS 'cancelled';
        EXCEPTION
            WHEN duplicate_object THEN
                -- value already exists
                NULL;
        END;
    END IF;
END $$;

ALTER TABLE "InterviewSession"
    ADD COLUMN IF NOT EXISTS "chunks_directory_name" TEXT;

