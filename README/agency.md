# Agency Module

## Purpose
Handles agency account lifecycle: signup/login, verification, profile updates,
password changes, and password reset flow.

## Core Tables (schema)
- `Account`
  - `email` (unique), `f_name`, `l_name`, `user_name`
  - `verified` flag
  - `agency_id` (1:1 with `Agency`)
  - `credential_id` (1:1 with `Credential`)
- `Agency`
  - Company profile fields
  - Relations: `jobs`, `teams`, `invitations`, `account`
- `Credential`
  - `password_hash`
- `Token`
  - `refresh_token` per account
- `Otp`
  - `code`, `purpose`, `expires_at`, `used_at`
- `VerifyAccountToken`
  - `token`, `expires_at`, `used_at`

## Relationships
- `Account` → `Agency` (optional 1:1)
- `Account` → `Credential` (required 1:1)
- `Account` → `Token` (1:N)
- `Account` → `Otp` (1:N)
- `Account` → `VerifyAccountToken` (1:N)
- `Agency` → `Job` (1:N)
- `Agency` → `Invitation` (1:N)

## Endpoints (controller: `agency.controller.ts`)
Public:
- `POST /agency/signup` - create account
- `POST /agency/login` - login, returns access/refresh tokens
- `POST /agency/token/refresh` - refresh access token
- `POST /agency/logout` - revoke refresh token
- `GET /agency/verify-account` - verify account via token (redirect)
- `POST /agency/verify-account/confirm` - verify token (JSON)
- `POST /agency/resend-verification` - resend verification email
- `POST /agency/password/reset/request` - request password reset OTP
- `POST /agency/password/reset/verify` - verify reset OTP
- `POST /agency/password/reset/confirm` - reset password using OTP

Authenticated (JWT):
- `GET /agency/overview` - onboarding overview
- `GET /agency/account/me` - current account profile
- `PATCH /agency/brand` - update account profile fields
- `PATCH /agency/agency` - update agency data
- `PATCH /agency/password` - change password

