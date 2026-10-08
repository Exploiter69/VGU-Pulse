# VGU Pulse — Telegram Growth Engine Contract

## Deep-link contract

VGU Pulse uses Telegram Mini App direct links in the form:

`https://t.me/<bot-username>?startapp=<target>`

Supported targets are intentionally bounded:

- Sections: `home`, `ask`, `community`, `campus`, `academics`, `people`, `tools`, `me`, `exam`, `mess`
- Posts: `post:<id>`
- Polls: `poll:<id>`
- Events: `event:<id>`
- Communities: `community:<slug>`

Invalid or oversized targets are rejected by `/api/share-link`; arbitrary URL/path input is never forwarded.

The Worker caches the bot username in memory for six hours and coalesces concurrent `getMe` requests. Cache state is not persisted in D1.

Telegram exposes the `startapp` value to the Mini App as `start_param`; VGU Pulse also accepts the URL query fallbacks used by Telegram clients. citeturn0search0

## Exact entity resolution

- `post:<id>` and `poll:<id>` open the Community surface and resolve the exact entity.
- `community:<slug>` opens the requested community feed.
- `event:<id>` opens Campus and targets the exact event card.
- Section targets resolve to the corresponding existing Mini App view; `me` maps to My Pulse, `exam` to the academic planner, and `mess` to student tools/campus extras.

The client remains progressive-enhancement based: no router or SPA framework was introduced.

## Channel card contract

Channel delivery is bounded by the existing 15-minute Worker cron. Each cron can publish at most one new card.

Candidate types, in priority order:

1. **Today's campus poll** — bounded option buttons for one-tap voting plus an exact poll deep link.
2. **Upcoming event** — only events within the next 24 hours; RSVP, Remind me, and exact event deep link.
3. **Mess pulse** — only when there are at least five student ratings for the day.
4. **Helpful student thread** — recent exam/notes/question/discussion content, explicitly labeled as student-reported and never as official VGU information.

Every successful card gets a unique D1 delivery key in `telegram_channel_cards`. Failed Telegram sends release the key so a later cron can retry. This prevents repeated weekly/digest fan-out and keeps the channel bounded.

Groups are not used as persistence or system-of-record surfaces.

## Bot one-tap actions

Telegram callback queries support:

- `vote:<poll-id>:<option-id>`
- `rsvp:<event-id>`
- `remind:<event-id>`
- `share:card`

Callbacks are authenticated by Telegram's webhook secret boundary, use the Telegram sender ID, validate the target against D1 state, and return a short callback acknowledgement. Poll buttons are cleared by the channel message flow only after the action succeeds at Telegram level.

## Notifications

The existing notification sweep remains opt-in and bounded:

- existing preference gates remain authoritative;
- the scheduled sweep continues on the 15-minute cron;
- pending notification selection remains capped at 18;
- Telegram 403/429/retry handling remains unchanged;
- event reminders remain opt-in and are independently capped at 18 candidates per sweep.

Phase 2 does not add a paid notification provider or second workflow system.

## Manual verification still required

- Telegram Desktop/mobile Mini App deep-link behavior for representative section/entity targets.
- Real channel posting and callback behavior in a Telegram channel.
- Real Telegram 403/429 delivery behavior.
