# Phase 15 — Production Hardening

Status: implementation complete; deployment validation pending.

## Scope

Phase 15 hardens the existing VGU Pulse production surface without changing the architecture or adding paid infrastructure.

### Authentication and Telegram trust
- Telegram init data is rejected when empty, oversized, malformed, stale, or dated more than 60 seconds in the future.
- Telegram user identity fields are type-checked and bounded.
- Telegram hash comparison avoids early string mismatch exits.
- Telegram webhook secret validation fails closed when the secret is missing.
- Auth and webhook malformed JSON returns `400` instead of an uncaught exception.

### Privacy and response safety
- Dynamic JSON responses use `Cache-Control: no-store`.
- JSON responses send `X-Content-Type-Options: nosniff`.
- `/health` reports `503` when D1 is unavailable instead of claiming healthy service.

### Community abuse controls
- Student post creation is bounded to 10 posts per Telegram identity per rolling hour.
- Student reply creation is bounded to 30 replies per Telegram identity per rolling hour.
- Student reports are bounded to 30 reports per Telegram identity per rolling hour for posts, replies, and profiles.
- Existing duplicate-report protection remains enforced by database uniqueness.
- Existing three-report automatic hiding remains enforced.
- Rate-limited writes return HTTP `429`.

### Regression coverage
- Valid, stale, and future Telegram sessions.
- Malformed Telegram user fields.
- Malformed authentication JSON.
- Missing webhook secret.
- Malformed webhook JSON.
- No-cache response headers.

## Non-goals

No Redis, KV, R2, Kafka, Celery, paid APIs, paid hosting, new workflow system, or architecture redesign was introduced.

## Validation gate

Before calling Phase 15 production-complete:

1. `npm test`
2. `npm run check`
3. `npx wrangler deploy`
4. Verify `/health` returns HTTP 200 with `"database":true`.
5. Verify public Home still loads.
6. Verify Signal failure remains non-fatal to Home.
7. Verify authenticated participation still works from Telegram.
8. Verify malformed/auth-invalid requests return safe status codes.
