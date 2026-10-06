# Gate 5 — Student Intelligence

Status: complete

## Goal

Make VGU Pulse useful for practical student questions by turning the existing official and community data into a deterministic, searchable knowledge layer.

## Delivered

- **Ask Pulse** search experience in the Mini App.
- Unified search across:
  - verified VGU-Signal information,
  - official student toolkit links,
  - official campus guide entries,
  - student-reported community posts.
- Deterministic relevance scoring; no LLM, paid API, external AI provider or new workflow.
- Quick searches for common needs such as exam forms, medical help, transport and hostels.
- Every result carries an explicit trust label:
  - **Official** — VGU-published/trusted information.
  - **Student-reported** — community information.
- Official results link back to their source where available.
- Empty/unmatched searches fail safely instead of inventing an answer.

## Trust boundary

Pulse does not claim access to private ERP, Digicampus or other authenticated student systems.

Pulse does not convert student reports into official facts.

Search is retrieval and ranking, not generative answering. If Pulse has no matching source, it says so.

## Infrastructure

- Existing Cloudflare Worker + D1 + VGU-Signal service binding only.
- No new database table or migration.
- No paid service.
- No external AI API.
- No local LLM.
- No second workflow.

## Validation

1. 'npm test'
2. 'npm run check'
3. 'npx wrangler deploy'
4. Mini App acceptance:
   - Ask Pulse appears before the main information sections.
   - Empty search returns useful official/toolkit results.
   - Exam/medical/transport/hostel queries return relevant official results.
   - Student-reported results remain explicitly labelled.
   - Source links open the underlying official source.
   - Unrelated queries return a no-match message.
   - Existing Toolkit, Campus Guide, Posts, Replies, Profiles and Poll remain functional.

## Gate 5 outcome

VGU Pulse now has a practical retrieval layer between raw VGU-Signal data and the student-facing product. This is the foundation for a later academic companion without pretending to have access to private Digicampus/ERP data.