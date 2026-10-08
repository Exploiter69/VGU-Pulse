# Gate 28 — Post-Gate Audit Corrections

Status: hardening branch only; production untouched.

## Corrections found by re-audit

- Community UI now distinguishes an expired Telegram session from a generic feed failure and explicitly tells the student to reopen Pulse from Telegram.
- Community poll UI now renders the viewer's selected option as their choice instead of silently discarding the API's selected_option_id.
- Telegram /resource captions now tokenize on actual whitespace and the parser has a focused regression test.
- Teacher/elective reviews are one-per-student/course; migration 0019 removes legacy duplicates before creating the unique index, and the behavior suite verifies update-in-place semantics.
- Migration 0020 preserves moderation history against a stable target Telegram user id, and reporting paths record that identity for V2 plus legacy profile/post/reply reports.

## Verification boundary

- The hardening branch is exercised through the existing draft verification PR workflow; no production deployment or remote D1 migration is performed.
- Fresh-D1 migration coverage includes 0019 and 0020 through the real Wrangler harness.
- Existing-0009 compatibility coverage remains in the behavior suite; 0019/0020 are append-only migrations.

## Manual verification still required

- Real Telegram Desktop/mobile Mini App behavior.
- Real Telegram 403/429 delivery behavior and Telegram channel posting.
- Representative legacy V1→V2 migration export review before any production data operation.
- Production D1 state must not be changed from this branch.
