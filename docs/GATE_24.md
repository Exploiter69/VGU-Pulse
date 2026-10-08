# Gate 24 — Gate 0/1 Hardening Evidence

## Initial real-D1 finding

The first Wrangler createTestHarness run reproduced the community replies failure against real D1. The original GET /api/community-v2/replies SQL had three bind placeholders for the mine, item_id, and block-filter values but supplied only two values. Real D1 reported:

`D1_ERROR: Wrong number of parameter bindings for SQL query.`

The regression now binds `(viewerId, itemId, viewerId)`, validates a safe positive item_id, and refuses replies whose parent item is not published or whose author is blocked.

## Additional real-D1 finding

The same behavior harness exposed a second placeholder defect in getItem(): the SELECT contains five viewer placeholders plus the item id, but the implementation supplied only four viewer ids plus the item id. This produced the same D1 binding error for otherwise valid post creation. The implementation now supplies all six values.

## Notification sweep budget

The sweep selects at most 18 notifications. Each candidate can require one Telegram fetch and at most one D1 state update; successful sends use one D1 batch for all sent_at writes. The fixed-path work therefore stays below the 50 D1/subrequest budget for the batch: one cleanup query + one pending query + up to 18 Telegram calls + one batched sent update, with failed-row updates batched where applicable. The sweep stops immediately on Telegram 429 and parks Telegram 403 rows.

## Regression policy

Behavior tests use Wrangler's real local D1 harness, apply the complete migration chain, seed two users, and exercise HTTP handlers. Static source assertions that duplicated behavior coverage are being removed in favor of these tests.

## Manual verification still required

- Telegram 403/429 behavior against a real Telegram API response.
- Mini App behavior on Telegram Desktop/mobile.
- Production D1 migration state is intentionally not touched by this branch.
