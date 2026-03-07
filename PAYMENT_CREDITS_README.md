# Payment Credits System

## Overview
The Payment Credits System introduces a robust quota and limits management engine for the Plato backend. It allows Agencies to subscribe to specific plans (`intro`, `base`, `pro`, `enterprise`), each with predefined quotas for core actions.

## Database Models
The system depends on three primary additions to the Prisma schema:
1.  **`PlanName` (Enum):** Defines the available tiers (`intro`, `base`, `pro`, `enterprise`).
2.  **`SubscriptionPlan` (Model):** Defines the limits/quotas for each plan.
    -   `interview_sessions_quota`
    -   `resume_analysis_quota`
    -   `job_posting_quota`
3.  **`AgencySubscription` (Model):** Links an `Agency` to a `SubscriptionPlan` and tracks real-time usage.
    -   `used_interview_sessions`
    -   `used_resume_analysis`
    -   `used_job_posting`

## Quota Enforcement Mechanisms

The backend enforces quotas at the service level using generic mechanisms adapted to the specific feature's workflow:

### 1. Synchronous Quota Consumption
Features like Job Creation and Interview Scheduling consume quota immediately upon action.
*   **Job Postings:** Validated in `JobService.createJob`. Uses a `$transaction` to ensure `used_job_posting` does not exceed `job_posting_quota` before creation.
*   **Interview Sessions:** Validated in `InvitationService.createInvitation`. Increments `used_interview_sessions` inside a `$transaction` when generating a new invitation token.

### 2. Asynchronous (Deferred) Quota Consumption
Features relying on external APIs (like AI resume analysis) defer actual quota consumption until successful processing to ensure failed processing doesn't penalize the user.
*   **Resume Analysis:** 
    1.  **Upfront Check:** `ResumeService.processResumes` validates that the Agency has enough remaining `resume_analysis_quota` for the uploaded `files.length` before accepting the upload.
    2.  **Deferred Consumption:** `ResumeBatchesWorker` (which handles OpenAI batch callbacks) increments `used_resume_analysis` *only* for resumes that are successfully analyzed and structured by the AI.

### 3. Unlimited Tiers
Agencies mapped to the `enterprise` plan automatically bypass all `used >= quota` validation checks securely across all services.
