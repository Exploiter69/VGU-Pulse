# Phase 13 — Campus Services

Status: complete in source; production deployment pending local validation.

## Goal

Turn the existing Campus view into a practical, source-backed student services directory: not just links, but answers to "where do I go?", "who handles this?", and "what service is available?"

## Delivered

- Official campus facilities remain clearly labelled as **Official**.
- Official faculty/department discovery is included, with CSE, Mechanical, Civil and Electrical department entries plus the full published directory.
- Searchable campus/services directory.
- Student-support services:
  - Student Cell
  - Controller of Examinations
  - ERP/support boundary
  - grievance support
  - anti-ragging support
- Practical campus services:
  - Academic Block
  - Technology Block
  - Administrative Block
  - Central Library / Knowledge Resource Centres
  - Medical Aid Centre
  - Transport
  - Hostels
  - Students' Mess
  - Campus Canteen
  - Lost & Found
  - Mailroom
  - Provision Store
  - Book & Stationery Shop
  - ATM
  - Gymnasium
- Published contact details are shown where VGU currently publishes them.
- Official source links remain attached to every directory entry.
- Ask Pulse can now surface key campus-support offices in deterministic search.
- Existing Student Toolkit links remain available for ERP and official forms.
- No private ERP/Digicampus data is accessed or represented as public information.
- Student-reported information remains separate from official VGU information.

## Trust boundary

- Campus directory entries are sourced from VGU's public pages/handbook.
- Contact details are presented as published VGU information, not as independently verified personal data.
- Pulse does not claim live availability, queue status, seat availability, or private office schedules unless VGU publishes them.
- Where a service's current timing can change, the official VGU source is authoritative.
- Community posts never become official campus-service facts.

## Infrastructure

- No new service.
- No paid API.
- No AI provider.
- No Redis/Kafka/Celery/Kubernetes.
- No new D1 migration.
- Existing Worker + static asset + D1 + Signal service binding remain unchanged.
- Cost remains ₹0 / $0.

## Validation

Run from the existing checkout:

```bash
cd ~/VGU-Pulse
git pull --ff-only origin main
npm test
npm run check
npx wrangler deploy
```

After deployment, verify:
1. Campus view loads without Telegram authentication.
2. Campus search finds Student Cell, exams, medical, transport, hostel and support services.
3. Each result is labelled Official and opens the VGU source.
4. Published contact details are visible where available.
5. Ask Pulse finds Student Cell and Controller of Examinations.
6. Existing Home, Ask, Academics, Community, People, Tools and Pulse views remain usable.
7. Student-reported content remains visibly separate from official campus information.
