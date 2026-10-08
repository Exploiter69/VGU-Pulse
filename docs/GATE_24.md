# Gate 24 — Behavior-Test Hardening & Repository Hygiene

Status: complete on `hardening/gate-0`; production untouched.

## Scope

Gate 0 establishes a real Cloudflare Worker integration-test harness and removes repository/test infrastructure gaps identified in the independent hardening audit.

## Behavior harness

The repository now uses Wrangler's `createTestHarness()` integration API, backed by the local Worker runtime, instead of the incompatible low-level Miniflare constructor shape encountered with the installed Wrangler/Miniflare release.

The harness:

- starts the real VGU-Pulse Worker from `wrangler.jsonc`;
- replaces `SIGNAL_SERVICE` with a local test Worker;
- applies every migration in `migrations/` to isolated local D1 storage;
- seeds real D1 rows for two authenticated students, profiles, a community item, and replies;
- generates a correctly signed Telegram Mini App initData value for the test viewer;
- exercises the actual Worker HTTP handler rather than importing the handler implementation directly.

Test file: `tests/behavior/vgu-pulse.test.ts`.

## Replies regression — before fix

The first behavior regression was intentionally run against commit `251f75b` before changing the application query.

Result:

```
D1_ERROR: Wrong number of parameter bindings for SQL query.
HTTP status: 500
```

The failing test expected the published replies endpoint to return HTTP 200 with the seeded author/viewer replies.

CI evidence: the Gate 0 behavior run reported 49 passing tests and 1 failing behavior test before the fix.

## Replies remediation

The V2 replies handler now:

1. validates `item_id` as a safe positive integer;
2. requires the parent community item to exist, be `published`, and be visible to the viewer;
3. keeps published-reply filtering;
4. keeps blocked-author filtering;
5. binds the reply SQL parameters in the required order:
   `(viewerId, itemId, viewerId)`.

A regression also hides the parent item after the normal response and verifies that the endpoint returns `404 item_not_found` instead of exposing replies from a hidden thread.

## Static-test replacement

The old static assertion that depended on the exact reply SQL string was removed because the new integration test now verifies the actual behavior.

Other existing static production guards remain in CI, including duplicate-ID, native `confirm()`, safe-area, navigation-history, and forbidden-infrastructure checks.

## CI / repository hygiene

- `package-lock.json` is now committed.
- CI uses `npm ci`.
- CI has an explicit `Behavior tests` step.
- `.wrangler/`, `.dev.vars`, `.ci-dist/`, `accepts`, and `rejects` are ignored.
- No production deployment or remote migration was performed.
- No migration `0001` through `0009` was modified.
- No new migration was required for Gate 0.

## Verification

Final Gate 0 CI verification must remain green for:

- `npm ci`
- `npm run check`
- Worker dry run
- web JavaScript syntax
- static production guards
- `npm test`
- `npx vitest run tests/behavior`

The successful pre-hygiene verification reached 50/50 tests, including the real D1 behavior suite. A final CI run after the permanent `npm ci` workflow change is required before Gate 0 is declared fully closed.

## Needs manual verification

None for Gate 0 application behavior. Real Telegram-device and production-D1 verification remain explicitly outside this gate and are not claimed here.
