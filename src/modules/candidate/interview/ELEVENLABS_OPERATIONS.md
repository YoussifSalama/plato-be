# ElevenLabs Operations Guide

## Environment Variables

- `ELEVENLABS_API_KEY`: server-side API key used for signed URL retrieval.
- `ELEVENLABS_AGENT_ID`: default agent id when frontend does not override.
- `ELEVENLABS_WEBHOOK_SECRET`: optional HMAC secret for webhook verification.

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

- Metrics and webhook persistence are intentionally best-effort and should never break active interview flows.
- For stronger correlation, pass interview session id into conversation dynamic variables in the client/session bootstrap.
