# Gate 4 — Student Features

Gate 4 backend foundations are implemented without introducing paid infrastructure or a second workflow system.

## 4a — Daily campus utility
- Mess rating by day/meal with aggregate ratings.
- Daily campus question.
- Personal exam countdowns.

## 4b — Resource library
- Telegram file_id metadata storage only; no external object storage.
- Resource moderation states and reports.
- Bot intake via /resource document captions.

## 4c — Events and clubs
- Student-submitted events enter moderation.
- Admin-created events can publish immediately.
- RSVP/interest and opt-in reminder state.
- Existing communities remain the club/hostel/batch/branch/topic foundation.

## 4d — Expiring posts
- Lost/found, rides and roommate listings.
- Explicit expiry timestamps.
- Owner/admin resolution.

## 4e — Teacher/elective reviews
- Structured teaching/workload/support ratings.
- Aggregates are hidden until at least five published ratings.

## 4f — Growth
- Student result-card API.
- Top-thread API.
- Optional weekly Telegram channel digest, activated only when PULSE_CHANNEL_ID is configured.

All Gate 4 feature tables are append-only migrations 0015 and 0016.

### Manual verification
- Telegram document upload through the real Bot API.
- Telegram channel posting with an explicitly configured channel ID.
- Mini App presentation of the new feature surfaces.
- No production deployment or remote migration was performed.
