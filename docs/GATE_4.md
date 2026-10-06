# Gate 4 — Student Utility & Campus Discovery

Status: complete

## Goal

Make VGU Pulse useful for everyday student navigation without pretending that Pulse is the university ERP, Digicampus, or official source of truth.

## Delivered

- Student Toolkit with direct links to VGU's published student portals and forms.
- Searchable Campus Guide ("Where do I go?").
- Official campus directory entries for:
  - Academic Block
  - Technology Block
  - Administrative Block
  - Knowledge Resource Centres
  - Medical Aid Centre
  - Transport
  - Students' Mess
  - Campus Canteen
  - Lost & Found
  - Mailroom
  - Provision Store
  - Book & Stationery Shop
  - ATM
  - Hostels
  - Gymnasium
  - Student Handbook
- Every directory entry is labelled Official and links to the VGU source page/document.
- Student Posts remain the community layer for practical tips, corrections, questions and requests.
- The UI explicitly distinguishes official VGU information from student-reported information.

## Trust boundary

Pulse may organize and link official VGU information, but it does not invent official locations, timings, rules, fees or contacts.

Student-submitted information remains student-reported and is never promoted to an official announcement.

## Infrastructure

- Cloudflare Worker + D1 only.
- No new paid service.
- No new external API.
- No second workflow.
- No new database table or migration required for Gate 4.

## Source policy

Campus details are derived from VGU's published campus-facility, hostel, medical and transport pages. Portal links are the same student-gateway destinations exposed from VGU's own website.

## Validation gate

Before production deployment:

1. `npm test`
2. `npm run check`
3. `npx wrangler deploy`
4. Open Pulse from Telegram and verify:
   - Student Toolkit links open.
   - Campus Guide renders.
   - Search filters results.
   - Student Posts remain clearly labelled student-reported.
   - Official information remains separate from community content.
