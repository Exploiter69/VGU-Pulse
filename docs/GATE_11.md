# VGU-Pulse Phase 11 — Academic Intelligence

Status: implementation complete; production deployment pending local validation.

## Goal

Make Ask Pulse useful for common academic questions without introducing an LLM, paid API, new infrastructure, or access to private ERP/Digicampus data.

## Delivered

- Deterministic academic intent routing for:
  - exams
  - academic calendar
  - exam forms
  - backlog exams
  - re-registration
  - private academic student data
  - academic facilities
- Intent-aware ranking so the most relevant official VGU resource is preferred.
- Backlog queries prioritize the official Backlog Exam Form.
- Re-registration queries prioritize the official Re-registration form.
- Exam-form queries prioritize the official Exam Form.
- Private attendance, marks, results and personal timetable queries prioritize the Student ERP gateway.
- Ask Pulse displays the detected academic intent.
- Ask Pulse displays an explicit access boundary when the requested information is private ERP/Digicampus data.
- Added academic quick searches for common student tasks.
- Existing trust labels remain:
  - Official = VGU-Signal / official VGU resource
  - Student-reported = student community content

## Trust and privacy boundary

Pulse does not claim access to authenticated ERP/Digicampus records.

For questions such as personal attendance, marks, results or timetable, Pulse points students to the official Student ERP instead of inventing values.

Student posts remain explicitly non-official.

## Architecture

- Existing VGU-Signal Worker remains the official-information source.
- Existing VGU-Pulse D1 remains the student-community source.
- Deterministic TypeScript only.
- No LLM or external AI provider.
- No new database table.
- No paid service.
- No new infrastructure.

## Validation

From the local checkout:

```bash
git pull --ff-only origin main
npm test
npm run check
npx wrangler deploy
```

Expected test coverage includes academic intent routing, source prioritization, private-data boundaries, official/student trust labels, and no-match behavior.

After deployment verify:

1. Ask Pulse → **Backlog exam** returns **Backlog Exam Form** first.
2. **Re-registration form** returns **Re-registration** first.
3. **Academic calendar** is recognized as an academic intent.
4. **My attendance / marks / result / timetable** shows the ERP access boundary and Student ERP first.
5. Existing official and student-reported trust labels remain visible.
6. Existing Home, Academics, Community, People, Campus, Tools and Pulse views remain usable.

## Cost

$0 / ₹0 additional infrastructure.
