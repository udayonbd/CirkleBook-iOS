# Cirklebook Backend API Contract Needed for Full Feature Activation

This frontend preserves existing endpoints and expects additional services for the requested platform.

## Authentication
POST /api/v1/auth/register
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
POST /api/v1/auth/verify-email
POST /api/v1/auth/verify-phone
POST /api/v1/auth/2fa/*

## Moderation
POST /api/v1/moderation/scan
GET /api/v1/moderation/review-queue
PATCH /api/v1/moderation/reviews/:id (approve/reject/request_changes/escalate)
POST /api/v1/reports

## Verification
POST /api/v1/verification/applications
POST /api/v1/verification/:id/documents
POST /api/v1/verification/:id/payment
PATCH /api/v1/verification/:id/review

## Messaging
GET/POST /api/v1/conversations
GET/POST /api/v1/conversations/:id/messages
WebSocket presence/read-status channel

## Live / Video
POST /api/v1/live/sessions
WebRTC/SFU or streaming provider integration

## Ads / Monetization
POST /api/v1/ads/campaigns
POST /api/v1/ads/review
POST /api/v1/payments
GET /api/v1/monetization/eligibility
GET /api/v1/creator/earnings

## Internationalization
GET /api/v1/i18n/:language (optional server translation catalog)

## Security
Rate limiting, hashed passwords, session rotation/revocation, email/phone verification, recovery tokens, 2FA, RBAC, audit logs and moderator/admin permissions must be enforced server-side.
