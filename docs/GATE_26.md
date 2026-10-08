# Gate 26 — Community & Product Foundations

Status: implementation on hardening branch; production untouched.

## Implemented
- Gate 3 migration 0012 adds real approved communities, membership, topics, controlled VGU academic values, opt-in Telegram contact, discovery indexes and FTS5 search.
- The default community remains whole-campus; branch/year are profile/matching attributes rather than invented community slugs.
- Community post creation now requires an approved community record.
- Community join/leave endpoints use real community membership.
- Feed pagination for the default/new ordering uses an opaque (created_at,id) cursor.
- FTS5-backed title/body search replaces feed-wide LIKE scans.
- Legacy V1 provenance IDs are stored on migrated V2 items/replies.
- scripts/migrate-v1-to-v2.sql is rerunnable and maps V1 categories into V2 kinds while preserving votes and reply relationships.
- /api/share-link caches the bot username in Worker memory for one hour.
- Telegram contact is explicitly opt-in and defaults off.

## Academic source
The controlled program seed is based on VGU's current public 2026-27 program pages; Other remains available for values outside the maintained list. The implementation intentionally does not infer a student's program from Telegram identity.

## Migration safety
0012 is additive and does not modify 0001-0011. Existing free-form profile values are retained unless blank; new profile writes are constrained to the maintained controlled set or Other.

## Remaining Gate 3 work
- Full daily-capped helpful-answer reputation tuning remains to be verified in a later review.
- Full community moderation UI remains; admin community approval API is implemented.
- Profile discovery now returns the username only when contact is enabled.
- V1 endpoint/table removal only after migration verification.
- Full cursor coverage for non-new sorting modes.

## Final hardening completion

Gate 3 Q&A, communities, cursor pagination, FTS, opt-in Telegram contact, V1→V2 migration provenance, notification retry state, and moderation report history are implemented in migrations 0012–0014. Real-D1 behavior tests cover the migration chain and the Q&A/contact flows.
