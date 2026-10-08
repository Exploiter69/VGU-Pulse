# VGU Pulse Roadmap

## Current delivery status

- Phase 9 — People & Collaboration: complete
- Phase 10 — Student Utility / Daily Tools: complete
- Phase 11 — Academic Intelligence: complete
- Phase 12 — Community Quality + Reddit-style voting: complete
- Phase 13 — Campus Services: complete in production
- Phase 14 — Personal Pulse: complete in production
- UI/UX Redesign — Student OS: complete in production
- Phase 15 — Production Hardening: complete in production
- Phase 16 — Student Reality & Information Coverage: complete in production
- Phase 17 — Notifications & Attention: complete in production
- Phase 18 — Student Knowledge & FAQ: complete in production
- Phase 19 — Community Intelligence: complete in production
- Phase 20 — Personal Student OS: complete in production
- Phase 21 — Telegram Mini App Excellence: complete in production
- Phase 22 — Observability & Reliability: complete in production
- Phase 23 — Final Student Acceptance: complete in production


## Gate 0 — Product and architecture foundation
- repository contract
- product boundary
- Telegram surface model
- data ownership
- safety baseline
- $0 constraint
- local development setup

## Gate 1 — Telegram shell
- Bot created/configured
- Mini App shell
- Telegram authentication validation
- health endpoint
- minimal backend
- local tests

## Gate 2 — First useful campus experience
- Pulse Home
- official Signal items
- events
- daily poll
- student question submission
- basic notifications

Goal: a student can open Pulse and get immediate value.

## Gate 3 — Participation loop
- poll results
- reactions/ratings
- sharing/deep links
- event interest
- student contributions
- moderation basics

Goal: students contribute, not only consume.

## Gate 4 — Campus communities
- clubs
- branch/year communities
- hostel/community spaces where appropriate
- community discovery
- group integrations

Goal: build local density.

## Gate 5 — People
- profiles
- interests
- study/project/activity matching
- connections
- privacy-controlled presence

Goal: connect students around real activities.

## Gate 6 — Social
- moderated confessions
- memes
- hot takes
- anonymous questions
- topic discussions
- stronger moderation tooling

Goal: student internet layer.

## Gate 7 — Connect
- mutual anonymous messaging
- temporary voice rooms
- activity matching
- richer communities

Goal: direct interaction with consent.

## Gate 8 — Dating
- opt-in 18+ mode
- mutual matching
- block/report
- privacy controls
- dedicated safety review

Goal: dating as one mode of the network, not the network itself.

## Gate 9 — Advanced social
Potentially:
- video
- live rooms
- richer profiles
- campus games
- presence experiences

Only build features that demonstrate demand and can meet safety requirements.

## Kill conditions

Stop or change direction if:
- students do not return without artificial incentives
- the first useful experience is not compelling
- moderation load exceeds available capacity
- campus density cannot be achieved
- the product becomes dependent on paid infrastructure
- students prefer existing tools for every core use case


## Community Daily-Habit Execution

- Phase 1 — Community UX Polish: complete on 2026-10-08.
- Community now defaults to For You with cohort-aware ranking and a campus-Trending fallback.
- The Community compose surface prioritizes seven common intents and keeps the remaining intents behind More….
- Campus Pulse summaries, unanswered-answer actions, solved/accepted visibility, and lightweight reputation badges are part of the Community surface.
- Telegram-native haptics, safe-area behavior, moderation/privacy contracts, and the static Mini App delivery model remain unchanged.

## Student OS completion roadmap

### Phase 16 — Student Reality & Information Coverage
Public VGU student knowledge is indexed deterministically while private ERP/Digicampus boundaries remain explicit.

### Phase 17 — Notifications & Attention
Opt-in official and community Telegram notifications use D1 + the existing Worker Cron Trigger.

### Phase 18 — Student Knowledge & FAQ
Common student questions map to deterministic official answers and source links.

### Phase 19 — Community Intelligence
Unanswered, useful and recent student signals are surfaced without confusing them with official information.

### Phase 20 — Personal Student OS
My Pulse combines personal profile, academic planning, community activity and attention.

### Phase 21 — Telegram Mini App Excellence
Telegram-native behaviors and sharing are hardened without replacing the existing static Mini App architecture.

### Phase 22 — Observability & Reliability
Partial failures are isolated and CI becomes a permanent typecheck/test gate.

### Phase 23 — Final Student Acceptance
The final gate validates core student journeys, privacy, failure behavior, moderation and production deployment.

## Current product boundary

VGU Pulse does not replace Student ERP/Digicampus, VGU-Signal, WhatsApp, Telegram itself or university administrative systems. It is the student-facing layer that connects trusted public information, useful campus navigation, personal planning and opt-in student participation.
