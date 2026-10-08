# Gate 26 — Community & Product Foundations

Status: implemented on hardening branch; production untouched.

## Implemented
- Default feed is whole-campus; branch/year remain filters and matching attributes.
- Controlled VGU program/branch options are enforced on profile writes.
- Migration 0017 maps common legacy free-text academic values and converts remaining unmapped values to Other.
- Migration 0018 backfills existing V2 posts into FTS5 so search covers pre-migration data as well as new posts.
- Approved communities, membership and moderator foundations are present; user-created slugs are not accepted as post communities.
- Cursor pagination uses `(created_at,id)` for the default chronological feed.
- FTS5 title/body search has insert/update/delete triggers and a legacy-data backfill.
- Q&A reply voting, accepted answers/Solved, unread markers and capped helpful-answer reputation are implemented.
- Telegram contact is opt-in and only exposed when enabled.
- `/api/share-link` caches the bot username in Worker memory.
- V1→V2 migration script preserves legacy IDs and vote/reply relationships; legacy endpoints remain for compatibility.

## Verification
The behavior suite covers fresh migration application, an existing-0009 upgrade path, controlled-value mapping and FTS backfill, community approval, cursor pagination, contact opt-in and Q&A flows.

## Remaining manual verification
- Verify the real Telegram Mini App presentation on Desktop/mobile.
- Verify the V1→V2 migration against a representative legacy export before any production data operation.
- Do not remove V1 tables/endpoints until that migration is reviewed and validated.

## Telegram framing
The Mini App CSP intentionally does not use `frame-ancestors 'none'`; Telegram Mini App embedding is an explicit requirement. Keep framing policy reviewed together with Telegram Desktop/mobile behavior when changing CSP.
