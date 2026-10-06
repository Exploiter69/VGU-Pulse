# Gate 2 — Home + Participate

## Goal

Turn the authenticated Telegram shell into the first useful VGU-specific student loop:

**Open Pulse → see the campus home → answer one question → see the campus result.**

## Included

- [x] Telegram-authenticated Mini App home
- [x] Daily campus poll stored in D1
- [x] One vote per Telegram account per poll
- [x] Vote changes supported while the poll is open
- [x] Live aggregate result after voting
- [x] Explicit trust labels separating official and student/community information
- [x] No dependency on VGU-Signal internal tables
- [x] No paid service or new infrastructure

## Intentionally not included

- Fake notices, events, or student posts
- Generic AI chat
- Anonymous DMs
- Random chat
- Public location tracking
- Dating/matching
- Unmoderated social feed

## API

- GET /api/home
- POST /api/polls/vote with x-telegram-init-data

Votes are authenticated server-side using the same Telegram Mini App HMAC validation used by Gate 1.

## Deployment

After pulling the Gate 2 commits:

1. Apply the new migration remotely.
2. Run typecheck and tests.
3. Deploy the Worker.
4. Open the Mini App and cast a poll vote.

## Next gate

Gate 3 should connect a small, explicitly trusted subset of VGU-Signal information to the Pulse home without coupling Pulse to Signal's internal D1 schema.
