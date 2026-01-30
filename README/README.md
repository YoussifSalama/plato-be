# Plato Backend Readme

This folder contains module-level documentation for the backend. Each module
README includes:
- Purpose and responsibilities
- Core database tables and relationships (from `prisma/schema.prisma`)
- Public endpoints (controllers)

## Module Index
- `agency.md` - authentication, account, agency profile, password reset
- `job.md` - job CRUD, search, activation, job resumes listing
- `job-ai-prompt.md` - AI prompt CRUD and activation
- `resume.md` - resume ingestion, listing, details, actions
- `invitation.md` - invitation creation and email send
- `prisma.md` - Prisma module wiring

## Shared Concepts
- Auth: JWT-based, guarded via `JwtAuthGuard`, bearer token name `access-token`.
- Response shape: `{ message, statusCode, data, meta }` (see `src/shared/helpers/response.ts`).
- Database schema source: `prisma/schema.prisma`.

