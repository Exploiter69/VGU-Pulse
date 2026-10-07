# Student Reality Audit

Date: 2026-10-07

## Product decision

VGU Pulse is a complementary student layer. It does not replace Student ERP/Digicampus, official VGU administration, class-group communication, or Telegram.

## What Pulse can legitimately cover

- Official public VGU information surfaced through VGU-Signal.
- Public academic calendars, examination resources and forms.
- Public fees/payment guidance, with private payment state left to ERP.
- Placements, internships, events, clubs and student-life resources.
- Campus services, contacts, welfare and examination-office guidance.
- Deterministic FAQ/search over those sources.
- Student-reported questions, information and opportunities.
- Opt-in people discovery and local academic planning.
- Opt-in Telegram notifications.

## What remains private

Pulse does not claim access to:

- personal attendance
- personal marks/results/grades
- personal timetable
- private ERP/Digicampus assignments or notices
- private fee/dues status
- private ABC account data

When a query depends on those systems, Pulse explicitly routes the student to the official portal instead of fabricating an answer.

## Current public source coverage

The knowledge catalog is based on the current VGU public surfaces checked during this audit:

- Handbooks & Brochures / academic resources
- Academic calendars
- Examination Rules
- Student ERP and exam-form portals
- 2026–27 fee information
- Scholarships
- Training & Placement / placement overview
- Student Clubs & Societies
- Hostel information
- Events
- Student Welfare / Proctor
- Controller of Examinations
- Tele Directory / official contacts
- Campus facilities

Class WhatsApp/Telegram groups are not treated as authoritative sources because Pulse has no legitimate access to private group content.

## Student-value conclusion

The product should not attempt to become another ERP. Its highest-value role is to remove the fragmentation around the ERP: help students discover the right official source, understand what is public versus private, find campus services, organize their own deadlines, and participate in a trusted student network.

## Maintenance rule

Public URLs and descriptions must be rechecked whenever VGU changes its resource hub. Avoid embedding session-specific scholarship percentages or deadlines unless the source is explicitly session-scoped and the source date is preserved.
