# VGU-Pulse UI/UX Redesign

## Status

- Research: complete
- Product direction: Student OS
- Frontend redesign: complete in source
- Screen-level UX completion: implemented across Home, Ask, Community, People, Campus, Academics, Tools and Me
- Telegram-native interaction layer: implemented (theme, viewport, Back Button, contextual Main Button, haptics, fullscreen action)
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

## Implemented UX scope

- Five primary destinations: Home, Ask, Community, Campus, Me.
- Home is intent-first: today, verified information, local deadlines, student activity and shortcuts.
- Ask Pulse is the universal VGU knowledge surface with visually distinct Official VGU and Student-reported results.
- Community is discussion-first with compose, filters, voting/replies and contextual People/My activity access.
- People is discovery-first with search, filters, opt-in profile editing, block/report controls and visible deterministic match reasons where available.
- Campus is need-first with search, category shortcuts, official service directory and official portal links.
- Academics is task-first with Today/Upcoming/Overdue KPIs and the existing browser-only planner.
- Tools remains browser-only and is reachable contextually from Home and Me.
- Me is the personal space for activity, deadlines, partner suggestions, profile access, tools and settings.
- Telegram theme parameters, viewport changes, Back Button, contextual Main Button, haptics and fullscreen are wired without changing backend contracts.
- Native `confirm()` is intentionally avoided because the Mini App uses in-page confirmation patterns.

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
