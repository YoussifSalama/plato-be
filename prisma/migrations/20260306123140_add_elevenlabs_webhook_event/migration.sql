-- CreateTable
CREATE TABLE "ElevenLabsWebhookEvent" (
    "id" SERIAL NOT NULL,
    "interview_session_id" INTEGER,
    "conversation_id" TEXT,
    "event_type" TEXT,
    "source_type" TEXT,
    "transition_action" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElevenLabsWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ElevenLabsWebhookEvent_idempotency_key_key" ON "ElevenLabsWebhookEvent"("idempotency_key");

-- CreateIndex
CREATE INDEX "ElevenLabsWebhookEvent_interview_session_id_idx" ON "ElevenLabsWebhookEvent"("interview_session_id");

-- CreateIndex
CREATE INDEX "ElevenLabsWebhookEvent_conversation_id_idx" ON "ElevenLabsWebhookEvent"("conversation_id");

-- CreateIndex
CREATE INDEX "ElevenLabsWebhookEvent_created_at_idx" ON "ElevenLabsWebhookEvent"("created_at");

-- AddForeignKey
ALTER TABLE "ElevenLabsWebhookEvent" ADD CONSTRAINT "ElevenLabsWebhookEvent_interview_session_id_fkey" FOREIGN KEY ("interview_session_id") REFERENCES "InterviewSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
