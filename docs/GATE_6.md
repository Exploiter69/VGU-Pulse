# Gate 6 — Academic Companion

Status: complete

## Goal
Give students a practical academic planning layer without pretending Pulse can access private ERP or Digicampus data.

## Delivered
- Personal academic planner inside the Mini App.
- Add assignments, exams, projects and other academic tasks.
- Subject, due date and type are recorded.
- Automatic upcoming / due today / overdue state.
- Remove planner items.
- Local browser storage only; no paid service and no new database table.
- Official Student Handbook and Academic Facilities references remain clearly official.
- Explicit boundary: Pulse does not read private ERP/Digicampus attendance, marks, timetable or authenticated deadlines.

## Trust boundary
Personal planner entries are student-entered and local to the browser. They are not VGU official information.

Official academic references link to VGU sources.

## Infrastructure
Existing Cloudflare Worker + static Mini App only. No new service, API, migration, AI provider or paid infrastructure.

## Validation
- `npm test`
- `npm run check`
- Deploy with `npx wrangler deploy`
- Mini App acceptance:
  1. Academic Companion renders.
  2. Add assignment/exam with a due date.
  3. Item appears with correct subject/type/date.
  4. Due today/upcoming/overdue state is correct.
  5. Remove works.
  6. Reload preserves the local plan.
  7. Existing Ask Pulse, official information, posts, profiles and poll remain functional.
