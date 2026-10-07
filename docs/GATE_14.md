# Phase 14 — Personal Pulse

Status: complete in source; production deployment pending local validation.

## Goal

Make VGU-Pulse personally useful without paid infrastructure, private ERP/Digicampus access, or a new workflow system.

## Delivered

- Dedicated **My Pulse** view.
- Telegram-authenticated personal dashboard.
- Personal profile summary from the existing opt-in People profile.
- Personal community activity: published posts, published replies, and vote count.
- Recent contribution summary.
- Local academic-plan summary: overdue tasks and next deadlines.
- Profile-aware study/project partner suggestions using existing published People profiles.
- Matching uses program, branch, year and the existing "looking for" field.
- Suggestions respect existing profile visibility and block rules.
- No unsolicited messaging; Telegram IDs remain private.
- Campus Pulse voting remains available inside My Pulse.
- Public views remain usable without authentication; personal features require Telegram.
- No private attendance, marks, results, timetable, or authenticated Digicampus/ERP data is fetched.
- No new D1 migration.
- No paid API, AI provider, Redis, Kafka, Celery, Kubernetes, R2, or second workflow.
- Cost remains ₹0 / $0.

## Trust boundary

- Official VGU information continues to come from Signal.
- Personal profile and community activity are student-reported/user-owned data.
- Personal suggestions are deterministic matches, not official VGU recommendations.
- Academic deadlines in My Pulse come only from the student's browser-local Academic Companion.

## Validation

Run:

    cd ~/VGU-Pulse
    git pull --ff-only origin main
    npm test
    npm run check
    npx wrangler deploy

After deployment verify:

1. My Pulse appears in Telegram.
2. Without Telegram, public views still load and My Pulse explains authentication.
3. With Telegram, My Pulse loads profile/activity data.
4. Local academic deadlines appear without server storage.
5. People suggestions respect profile visibility and blocking.
6. Campus Pulse voting still works.
7. Home, Ask, Academics, Community, People, Campus and Tools remain usable.
8. `/api/me/pulse` rejects unauthenticated requests.
