# VGU Pulse — Phase Execution Tracker

Repository: `Exploiter69/VGU-Pulse`
Branch: `main`

## Mission

Make Community the strongest section and turn VGU Pulse into a daily campus habit while preserving the existing Telegram-first, zero-cost architecture.

## Non-negotiable invariants

- ₹0 / $0 infrastructure; Cloudflare Workers + D1 only.
- Telegram Bot + Mini App + Channel remain the primary product surfaces.
- No private ERP / Digicampus scraping or replacement.
- Official vs student-reported ownership remains explicit.
- Existing privacy, moderation, rate limits, report/block, anonymous HMAC aliases, and delete-all-data behavior must remain intact or improve.
- Static Mini App delivery remains `web/index.html` + `web/community-v2.js`.
- No microservices or second workflow system.
- No synthetic engagement or fake users.
- Every implementation phase must pass `npm run check`, `npm test`, and behavior tests before it is marked complete.

## Baseline — Phase 0

Status: **IN PROGRESS**

Baseline repository reviewed on 2026-10-08:

- `docs/PRODUCT.md` — reviewed
- `docs/ARCHITECTURE.md` — reviewed
- `docs/ROADMAP.md` — reviewed
- `docs/UI_UX_REDESIGN.md` — reviewed
- `docs/UI_UX_V3.md` — reviewed
- `docs/FINAL_AUDIT.md` — reviewed
- `docs/HARDENING_COMPLETION_AUDIT.md` — reviewed
- `docs/STUDENT_REALITY_AUDIT.md` — reviewed
- `web/index.html` — reviewed
- `web/community-v2.js` — reviewed
- `src/community-v2.ts` — reviewed
- `src/features-v4.ts` — reviewed
- `src/index.ts` — reviewed
- `src/notifications.ts` — reviewed

### Phase 0 acceptance

- [ ] Local `npm install` completes
- [ ] Local `npm run check` passes
- [ ] Local `npm test` passes
- [ ] Local D1 migrations apply cleanly
- [x] No production behavior changes made during baseline preparation
- [x] Phase execution tracker exists

### Baseline notes

- Current production checkpoint is `e676c1c`.
- Production Worker deployment is already successful.
- Production D1 migration `0020_moderation_target_identity.sql` is applied; no remote migrations remain.
- Phase 0 does not redeploy or alter production behavior.

## Phase 1 — Community UX Polish

Status: **NOT STARTED**

Goal: Community becomes the fastest place for a student to react, answer, ask, or rate something useful.

Acceptance checklist:

- [ ] For You is the default with a graceful campus-wide fallback
- [ ] Existing core filters remain available
- [ ] Helpful, actionable empty states
- [ ] Long posts collapse with Show more
- [ ] Reply hierarchy and accepted/solved states are prominent
- [ ] Intent picker is simplified with More…
- [ ] One primary Publish action
- [ ] Anonymous notice and rules acknowledgement preserved
- [ ] Lightweight reputation/badge treatment
- [ ] Confessions and Exam survival have distinct safe treatment
- [ ] Dismissible Campus pulse widgets
- [ ] One-tap Answer this for unanswered questions
- [ ] Global design-system consistency and Telegram-native behavior preserved
- [ ] Existing vote/follow/save/report/block/anonymous flows regress cleanly
- [ ] `npm run check` passes
- [ ] `npm test` passes
- [ ] Behavior tests pass
- [ ] Manual Telegram mobile + desktop Community smoke completed
- [ ] `docs/UI_UX_V3.md` updated

Commit(s): TBD

## Phase 2 — Telegram Growth Engine

Status: **NOT STARTED**

Acceptance checklist:

- [ ] Rich `startapp` deep-link contract
- [ ] Exact entity/section resolution
- [ ] Hardened bot username caching
- [ ] Lightweight bot actions
- [ ] Bounded, high-signal Channel cards
- [ ] Every Channel card deep-links into Mini App
- [ ] Notification sweep remains opt-in and bounded
- [ ] No paid dependency
- [ ] Tests/typecheck/behavior tests pass
- [ ] Deep-link and Channel card contracts documented

Commit(s): TBD

## Phase 3 — Home Daily Magnet

Status: **NOT STARTED**

Acceptance checklist:

- [ ] Home answers “what changed since yesterday?” quickly
- [ ] Official content remains distinct
- [ ] Student/community signals are high-signal
- [ ] Daily participation action is obvious
- [ ] Event and mess pulse are useful without clutter
- [ ] Personal academic radar preview remains student-owned
- [ ] Navigation shortcuts are frictionless
- [ ] Loading/empty/error states give next actions
- [ ] Tests and docs pass

Commit(s): TBD

## Phase 4 — Tools & Academic Polish

Status: **NOT STARTED**

Acceptance checklist:

- [ ] Personal academic radar
- [ ] Smart resource library improvements
- [ ] Teacher/elective aggregate improvements
- [ ] Listings search/interest/resolve/expiry polish
- [ ] Mess/facilities pulse
- [ ] Campus question of the day
- [ ] Shareable progress/result cards
- [ ] Official portal launcher
- [ ] No private ERP data
- [ ] Free-tier/moderation boundaries preserved
- [ ] Tests and docs pass

Commit(s): TBD

## Phase 5 — UI/UX Consistency & Discoverability

Status: **NOT STARTED**

Acceptance checklist:

- [ ] Five-tab hierarchy remains consistent
- [ ] No dead-end states
- [ ] Telegram-native navigation works throughout
- [ ] Touch targets and safe areas remain usable
- [ ] Trust labels remain meaningful
- [ ] Daily-return moments are subtly celebrated
- [ ] Onboarding remains short
- [ ] Privacy-safe usage counters/hooks are present if justified
- [ ] Core journeys regress cleanly

Commit(s): TBD

## Phase 6 — Seeding & Feedback Loop

Status: **NOT STARTED**

Deliverables:

- [ ] `docs/SEEDING_PLAYBOOK.md`
- [ ] Copy-ready outreach messages
- [ ] 30–50 real high-value topic prompts
- [ ] Deep-link sharing guidance
- [ ] Optional, rate-limited feedback prompt with consent
- [ ] Owner checklist for real activity
- [ ] No synthetic activity

Commit(s): TBD

## Phase 7 — Final Hardening & Handover

Status: **NOT STARTED**

Acceptance checklist:

- [ ] Full check/test/behavior suite green
- [ ] `docs/ROADMAP.md` updated
- [ ] `docs/PRODUCT.md` / UI docs updated where mental models changed
- [ ] Free-tier safety reviewed
- [ ] Manual Telegram/device-only verification items explicitly listed
- [ ] “What shipped” summary completed here

Commit(s): TBD

## Working rule

Complete and verify one phase before starting the next. Record the commit(s), key files, test results, and manual verification status here after each phase. Never claim production or real-device verification without direct evidence.
