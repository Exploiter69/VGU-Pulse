# VGU-Pulse UI/UX Redesign

## Status

- Research: complete
- Product direction: Student OS
- Frontend redesign: complete in source
- Backend/API architecture: unchanged
- Database migrations: none
- Paid infrastructure: none
- Production deployment: pending local validation + Wrangler deploy

## Primary information architecture

VGU-Pulse now presents five primary destinations:

1. **Home** — what matters today
2. **Ask** — VGU information and deterministic search
3. **Community** — student discussions, with People reachable as a related workflow
4. **Campus** — practical VGU services and facilities
5. **Me** — personal Pulse, academic plan, profile, and utilities

Existing views remain in the application so no feature is discarded:
- Academics
- People
- Tools
- Personal Pulse

They are reached contextually from the five primary destinations.

## Design principles

- Intent before feature names.
- Strong hierarchy instead of equal-weight cards.
- Official vs student-reported information is always visually distinguishable.
- Mobile-first Telegram Mini App behavior.
- Desktop uses the same information architecture with a persistent side navigation.
- Five primary destinations replace the previous eight-item top navigation.
- Browser-only academic planning and calculators remain local.
- Telegram identity remains optional for public browsing and required for participation.
- No unsolicited messaging.
- No private ERP/Digicampus data is invented or exposed.
- No new paid services or infrastructure.

## Visual system

The redesign introduces shared tokens for:
- surfaces
- borders
- typography
- accent
- semantic success/warning/danger states
- spacing and radii
- focus states
- reduced-motion behavior

Shared patterns include:
- app header
- navigation
- section headings
- trust badges
- action rows
- quick links
- search surfaces
- responsive cards
- mobile bottom navigation
- desktop side navigation

## Validation target

Before production release, validate:
- `npm test`
- `npm run check`
- Telegram Mini App on narrow mobile viewport
- Telegram Mini App on desktop
- Home / Ask / Community / Campus / Me navigation
- contextual Academics / People / Tools access
- Telegram-authenticated actions
- public browsing without Telegram authentication
- local academic planner persistence
- search and API error states
- safe-area spacing around mobile navigation
