# Resume Module

## Purpose
Upload/process resumes, list and fetch resume details, and apply actions
(deny/shortlist/invite).

## Core Tables (schema)
- `Resume`
  - File metadata, `job_id`
  - Action flags: `auto_invited`, `auto_shortlisted`, `auto_denied`
  - Relations: `job`, `invitation`, `resume_structured`, `resume_analysis`
- `ResumeStructured`
  - Structured JSON extracted from resume (1:1 with `Resume`)
- `ResumeAnalysis`
  - AI analysis (score, recommendation, insights) (1:1 with `Resume`)
- `ResumeProcessingBatch`
  - AI processing batch metadata (for async processing)

## Relationships
- `Job` → `Resume` (1:N)
- `Resume` → `Invitation` (optional 1:1)
- `Resume` → `ResumeStructured` (1:1)
- `Resume` → `ResumeAnalysis` (1:1)

## Endpoints (controller: `resume.controller.ts`, base `/resume`)
Authenticated (JWT):
- `POST /resume/process` - upload and process resumes (multipart)
  - Fields: `resumes[]` files, `job_id` number
- `GET /resume` - list resumes with filters/pagination
- `GET /resume/:id` - get resume by id
- `GET /resume/single/:id` - get full resume details
- `PATCH /resume/:id/deny` - update deny status
- `PATCH /resume/:id/shortlist` - update shortlist status
- `POST /resume/:id/invite` - invite resume owner

