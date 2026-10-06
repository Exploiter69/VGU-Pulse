# Gate 7 — Daily Student Utility

Status: complete

## Goal

Make Pulse useful every day by turning the existing local academic planner into a small personal dashboard, without adding paid infrastructure or private ERP/Digicampus access.

## Delivered

- Home now shows a **My day** card with the student's next local deadlines.
- Overdue and due-today task counts are surfaced immediately.
- Academics now supports filters for:
  - All tasks
  - Due today
  - Upcoming
  - Overdue
- Existing local planner data remains in browser storage only.
- Existing official VGU information, community, people, campus and poll surfaces are unchanged.
- No new database table, service, API, AI provider or paid infrastructure.

## Trust boundary

Academic tasks are student-entered personal data stored locally in the browser.

Pulse does not claim to know private ERP/Digicampus assignments, attendance, marks, timetable or authenticated deadlines.

## Validation

- `npm test`
- `npm run check`
- Deploy with `npx wrangler deploy`
- Mini App acceptance:
  1. Home shows the My day section.
  2. Empty planner explains how to add a task.
  3. Added tasks appear in My day.
  4. Overdue and due-today counts are correct.
  5. Academic filters show the correct subset.
  6. Removing a task updates both Academics and My day.
  7. Reload preserves the local planner.
  8. Existing Ask, Community, People, Campus and Pulse sections remain functional.
