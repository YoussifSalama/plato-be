# Job AI Prompt Module

## Purpose
Manages AI prompt templates used for job evaluation.

## Core Tables (schema)
- `JobAiPrompt`
  - `target`, `prompt`, `evaluation` (JSON), `is_active`
  - Linked to `Job` (optional 1:1)

## Relationships
- `JobAiPrompt` → `Job` (optional 1:1)

## Endpoints (controller: `job-ai-prompt.controller.ts`, base `/agency/job-ai-prompts`)
Authenticated (JWT):
- `POST /agency/job-ai-prompts` - create prompt
- `PATCH /agency/job-ai-prompts/:id/activate` - activate prompt
- `PATCH /agency/job-ai-prompts/:id/inactivate` - inactivate prompt

