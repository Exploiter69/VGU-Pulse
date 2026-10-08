# Gate 4 — Student Features

Status: implemented on the hardening branch; production untouched.

## 4a — Daily campus utility
- Mess rating by day/meal with aggregate ratings.
- Daily campus question with an admin-controlled setter and safe fallback question.
- Personal exam countdowns exposed in the Mini App.

## 4b — Resource library
- Telegram documents are stored as Telegram file_id metadata only; no external storage.
- `/resource type=PYQ subject=DBMS semester=5` style captions populate moderated metadata.
- Published resources are listed in the Mini App and can be reported.
- Reports move resources to review after the distinct-report threshold.

## 4c — Events and clubs
- Student-submitted events enter moderation; admin-created events can publish immediately.
- RSVP/interest and opt-in reminders are stored in D1.
- Existing approved communities provide the club/hostel/batch/branch/topic foundation.

## 4d — Expiring posts
- Lost/found, rides and roommate listings require future expiry.
- Expired listings are excluded and explicitly marked expired during reads.
- Owners/admins can mark listings resolved.

## 4e — Teacher/elective reviews
- Structured teaching/workload/support ratings.
- New reviews are pending moderation.
- Published aggregates remain hidden until at least five published ratings exist.

## 4f — Growth
- Student Pulse result-card data is exposed and shareable from the Mini App.
- Top-thread data is exposed for growth surfaces.
- Weekly top-thread Telegram posting is cron-gated by PULSE_CHANNEL_ID.

## Verification
Behavior coverage exercises the Gate 4 API flows, expiry validation and the five-published-rating aggregate threshold. No production deploy or remote migration was performed.

## Manual verification
- Real Telegram document upload and file metadata.
- Telegram channel posting with an explicitly configured channel ID.
- Mini App presentation/share behavior on Telegram Desktop/mobile.
