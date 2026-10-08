# Gate 25 — Correctness, Privacy & Reliability Hardening

Status: implementation complete on the hardening branch; production untouched.

## Implemented

- Content filter regexes now operate on word boundaries instead of matching literal backslashes.
- Threat and credential/OTP-sharing language returns 422.
- Self-harm language remains publishable and returns `support: true` plus verified Indian Tele-MANAS resources.
- Reputation awards now require a successful event insert and positive awards are capped at 25 points/day.
- Upvote removal/flip emits a compensating reputation event.
- Anonymous blocks carry source-item metadata and are displayed as `Anonymous author (from post #N)`; real public_id/display_name is never returned.
- Profile unblock uses an opaque block id.
- Student discovery requires valid Telegram initData.
- Notification records have explicit channels, retry state and channel-aware preference filtering.
- Personalized notifications skip recipients who blocked the author and are capped at three per recipient/day.
- V2 reply notifications include the post author preference path and own-thread replies automatically follow the thread.
- Trending uses hourly decay and subtracts downvotes.
- Community feed author profiles are joined in the feed query rather than fetched once per item.
- Reply reports have per-user dedupe and hourly limits; report thresholds enter `review` rather than permanently hiding content.
- Notification sweep isolates malformed Signal JSON, sends oldest-first, parks Telegram 403s, stops on 429, bounds retries, batches sent-state updates, and HTML-escapes message content.
- Notification preferences are strict booleans and support partial merges across official, community replies, community activity and personalized channels.
- Polls persist open/closed state and close time; closed polls reject votes.
- Home poll reads the Telegram initData header and returns the viewer's selected option.
- V2 item lookup returns `my_vote`.
- V2 POST/PATCH bodies enforce a 32 KiB limit.
- Community server errors return `internal_error` rather than raw error messages and log only a request id plus internal error text.
- Frontend V2 votes update the card optimistically without reloading the feed; follow/save already used card-local optimistic updates.
- Home poll requests now send Telegram initData.
- Community 401s are distinguishable as a Telegram-session-expiry condition.

## Migration 0010

`migrations/0010_gate1_hardening.sql` adds:

- addressable profile blocks while preserving existing block rows;
- anonymous block metadata;
- notification channels and retry fields;
- reply-report dedupe;
- notification/report indexes;
- community poll lifecycle fields.

The migration does not modify 0001–0009.

## Behavior coverage

The real Worker/D1 harness now verifies:

- complete migration application through 0010;
- the original replies binding regression and hidden-parent protection;
- threat rejection;
- self-harm support response;
- benign content;
- anonymous block privacy;
- reply-report dedupe;
- strict preference merging.

The original replies defect was reproduced before the Gate 0 fix with:

```
D1_ERROR: Wrong number of parameter bindings for SQL query.
HTTP status: 500
```

## Verification boundary

The GitHub PR CI is the required execution environment for the repository behavior suite. No production deployment, remote D1 migration, or real Telegram delivery was performed.

The following still require explicit CI/manual confirmation before merging this gate:

- final green CI after the complete Gate 1 patch series;
- migration compatibility on an existing 0009 database containing legacy block data;
- Telegram 403/429 delivery branches against a mocked Telegram API;
- 40-item feed query-count assertion;
- legacy V1 vote endpoint regression for posts/replies outside the newest page;
- frontend anonymous-reply toggle and full optimistic vote UI in a real Telegram device.

Gate 2/3/4 implementation was subsequently completed on the same hardening branch; see GATE_26.md and GATE_27.md for the reconciled status. This document records Gate 1 evidence only.
