# Invitation Module

## Purpose
Create invitations for candidates and send email notifications.

## Core Tables (schema)
- `Invitation`
  - Links agency → resume (unique per resume)
  - Relations: `tokens`
- `InvitationToken`
  - Token for invitation link, `expires_at`, `revoked`

## Relationships
- `Agency` → `Invitation` (1:N)
- `Resume` → `Invitation` (1:1)
- `Invitation` → `InvitationToken` (1:N)

## Endpoints (controller: `invitation.controller.ts`, base `/invitation`)
Authenticated (JWT):
- `POST /invitation` - create invitation and send email

## Related Flow
- Resume invite endpoint (`POST /resume/:id/invite`) internally calls the
  invitation service.

