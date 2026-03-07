# ElevenLabs Operations Guide

## Environment Variables

- `ELEVENLABS_API_KEY`: server-side API key used for signed URL retrieval.
- `ELEVENLABS_AGENT_ID_AR`: primary Arabic agent id for interview sessions where language is `ar`.
- `ELEVENLABS_AGENT_ID_EN`: primary English agent id for interview sessions where language is `en`.
- `ELEVENLABS_AGENT_ID`: optional fallback agent id used only when a language-specific id is missing.
- `ELEVENLABS_WEBHOOK_SECRET`: HMAC secret for webhook signature verification.
- `ELEVENLABS_MANAGED_PROMPT_VERSION`: optional prompt revision marker for backend-managed instructions (defaults to `v1`).
- `ELEVENLABS_ALLOW_AGENT_MUTATION`: defaults to `false`; when `true`, backend create/update agent endpoints are enabled for admin operations.

## Endpoints

- `POST /interview/elevenlabs-signed-url`
  - Supports optional `agent_id`, `interview_session_id`, `include_conversation_id`.
  - Returns `signed_url`, optional `conversation_id`, and `expires_at`.

- `POST /interview/realtime/metrics`
  - Collects and stores realtime quality metrics in session `qa_log` when session id is provided.

- `POST /interview/elevenlabs/post-call-webhook`
  - Accepts post-call payloads from ElevenLabs.
  - Verifies `elevenlabs-signature` when webhook secret is configured.
  - Attempts to correlate `interview_session_id` from dynamic variables and stores payload event.

## Signed URL Reliability

- Request timeout: 8 seconds per attempt.
- Retries: up to 3 attempts with linear backoff.
- Logging: attempts and latency are logged for observability.

## Notes

- Two-agent model is the default operating mode: AR and EN are routed explicitly from backend language context.
- Dialect handling (for example Egyptian Arabic `ar-EG`) is enforced by backend runtime prompt context, not by creating separate per-dialect agents.
- Never mutate/publish agents per interview at runtime; keep agent mutation as an explicit admin flow only.
- Metrics and webhook persistence are intentionally best-effort and should never break active interview flows.
- For stronger correlation, pass interview session id into conversation dynamic variables in the client/session bootstrap.
