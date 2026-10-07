# Phase 9 — People & Collaboration

Status: complete

## Goal

Turn People into a useful opt-in campus network for finding study partners, project teammates and collaborators without exposing Telegram identity or enabling unsolicited messaging.

## Delivered

- Opt-in student profiles remain the only public People identity.
- Public profile IDs are used instead of Telegram IDs.
- Discovery filters:
  - free-text matching across name, program, branch, bio and Looking for
  - program
  - branch
  - year
- Looking-for matching supports practical searches such as study groups, DSA partners, project teammates and hackathon collaborators.
- Profile cards show program, branch, year, bio and Looking for.
- Profiles can be hidden from People discovery and shown again.
- Profile owners can permanently delete their profile.
- Students can report profiles.
- Three reports hide a profile from normal discovery.
- Students can block profiles.
- Blocking is private and removes the blocked profile from the blocker's discovery in both directions.
- Blocked profiles can be unblocked from the owner's People controls.
- No direct messaging, Telegram ID exposure or unsolicited-contact mechanism was added.
- No paid services or external infrastructure were introduced.

## Privacy boundary

People is opt-in. A student must explicitly publish a profile to appear in discovery.

Hiding a profile removes it from public People discovery without deleting the profile. Deleting removes the profile permanently.

Blocking is stored privately against Telegram user IDs and is never exposed through the public profile API.

## Trust boundary

People profiles are student-reported, not official VGU information.

Profile reports use the existing three-report threshold. Official VGU information continues to come only through VGU Signal.

## Infrastructure

- Existing Cloudflare Worker
- Existing VGU Pulse D1
- One new D1 table for private profile blocks
- No paid API
- No AI service
- No Redis/Kafka/Celery/Kubernetes
- No direct messaging service

## Validation

```bash
npm test
npm run check
npx wrangler deploy
```

Acceptance:

1. People can be searched by free text.
2. Program, branch and year filters work.
3. Looking-for text is searchable.
4. Published profiles remain opt-in.
5. A student can hide and re-show their profile.
6. A student can delete their profile.
7. A student can report another profile.
8. Three reports hide a profile.
9. A student can block another profile.
10. Blocked profiles disappear from that student's discovery.
11. A student can unblock a blocked profile.
12. Telegram IDs are never returned by public People discovery.
13. No unsolicited messaging feature exists.
14. Community, Ask, Academics, Campus and Pulse remain independent.
