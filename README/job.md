# Job Module

## Purpose
CRUD for jobs, activation toggles, search/filters, and listing resumes by job.

## Core Tables (schema)
- `Job`
  - Title, type enums, location, salary fields
  - Thresholds: `auto_score_matching_threshold`, `auto_email_invite_threshold`,
    `auto_shortlisted_threshold`, `auto_denied_threshold`
  - `is_active` flag
  - Relations: `agency`, `resumes`, `resume_analyses`, `jobAiPrompt`

## Relationships
- `Agency` → `Job` (1:N)
- `Job` → `Resume` (1:N)
- `Job` → `ResumeAnalysis` (1:N)
- `Job` → `JobAiPrompt` (optional 1:1)

## Endpoints (controller: `job.controller.ts`, base `/agency/jobs`)
Authenticated (JWT):
- `POST /agency/jobs` - create job
- `PATCH /agency/jobs/:id` - update job
- `GET /agency/jobs` - list jobs with filters/pagination
- `GET /agency/jobs/search` - search active jobs for combobox
- `GET /agency/jobs/:id` - get job details
- `GET /agency/jobs/:id/resumes` - list resumes for job
- `PATCH /agency/jobs/:id/activate` - activate job
- `PATCH /agency/jobs/:id/inactivate` - inactivate job
- `POST /agency/jobs/:id/ai-prompt` - create/update AI prompt for job

