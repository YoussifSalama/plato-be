-- Create JobAiPrompt table
CREATE TABLE "JobAiPrompt" (
    "id" SERIAL NOT NULL,
    "target" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "evaluation" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobAiPrompt_pkey" PRIMARY KEY ("id")
);

-- Add job_ai_prompt_id to Job and link to JobAiPrompt
ALTER TABLE "Job"
ADD COLUMN "job_ai_prompt_id" INTEGER;

CREATE UNIQUE INDEX "Job_job_ai_prompt_id_key" ON "Job"("job_ai_prompt_id");

ALTER TABLE "Job"
ADD CONSTRAINT "Job_job_ai_prompt_id_fkey"
FOREIGN KEY ("job_ai_prompt_id") REFERENCES "JobAiPrompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

