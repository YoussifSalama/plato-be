ALTER TABLE "InterviewSession"
ADD COLUMN "close_without_confirm_cancel_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "close_without_confirm_postpone_count" INTEGER NOT NULL DEFAULT 0;
