# VGU Pulse UI/UX — Simplification Pass

Date: 2026-10-07

## Why this pass exists

The previous UI had the right feature set but the wrong information hierarchy. It exposed too many concepts at once:

- five primary navigation destinations plus three hidden secondary views
- a legacy Community surface and a second V2 Community surface on the same screen
- many community types presented as equally important tabs
- compose fields permanently visible instead of being an intentional action
- People, Academics and Tools reachable from scattered shortcuts rather than one clear home
- notifications and reputation mixed into the Community experience

The result was feature discoverability without task discoverability: students could see many capabilities but could not predict where a task belonged.

## New mental model

Pulse has five stable top-level destinations:

1. **Home** — what matters today.
2. **Ask** — find an answer or the right official source.
3. **Community** — talk to students and find student knowledge.
4. **Campus** — find services, places and official portals.
5. **Me** — your plan, profile, notifications and private tools.

Secondary capabilities live inside the destination that explains them:

- People → Community workflow / personal profile in Me.
- Academics → Home/Me → Study plan.
- Tools → Me → Student tools.
- Notifications → Me.
- Reputation → earned through Community, displayed with personal activity.
- Community topics → feed filters, not primary navigation.

## Community model

Community is now feed-first.

Always visible:
- Trending
- Latest
- Confessions
- Campus
- Exam survival
- Search
- Filter
- + Post

Secondary:
- senior → junior
- teammates
- notes/resources
- PYQs
- teacher/elective advice
- lost & found
- rides
- roommates
- exchange
- opportunities
- branch/year communities

Those remain available through the filter/composer surfaces without competing with the core feed.

## Visual direction

The interface uses a calm dark "campus utility" system:

- one primary accent
- semantic colors only for trust/status
- fewer bordered cards
- more whitespace and separators
- strong page titles
- compact secondary controls
- dialogs/sheets for advanced actions
- persistent primary navigation
- minimum touch-friendly controls

Official and student-owned information remain visually distinct.

## UX rules

1. Never expose a feature merely because it exists.
2. Prefer one obvious action over several equivalent actions.
3. Keep top-level navigation stable.
4. Keep related features together.
5. Put advanced filters behind Filter/More rather than making them permanent UI.
6. Compose is an action, not the entire page.
7. Search should search the current mental domain.
8. Trust labels should explain ownership, not decorate every card.
9. Empty/loading/error states must explain what the student can do next.
10. Preserve Telegram-native navigation and safe-area behavior.

## Research basis

Apple's current HIG recommends tab bars for top-level navigation, keeping the number of visible destinations small, labeling tabs clearly, and avoiding overflow tabs.

Discord's mobile navigation work similarly found that primary features became easier to discover when promoted into a small, consistent tab system, while secondary navigation remained within the current section.

Current university-app examples also converge on a small set of primary destinations with contextual access to events, services, academics, community and profile rather than exposing every feature as a top-level destination.

The redesign also follows touch-target guidance: important custom controls should be comfortably tappable, with 44px as a strong accessibility target where practical.

## Current implementation status

- Legacy Community duplicate surface removed.
- Community V2 rebuilt as a feed-first experience.
- Composer moved into a modal sheet.
- Advanced topic filters moved into a filter sheet.
- Community discovery moved into a secondary disclosure.
- People remains accessible from Community/Me without becoming another primary tab.
- Global visual hierarchy simplified.
- Backend/API/database contracts remain unchanged.
- No paid infrastructure introduced.

## Validation

Required before production deployment:

- TypeScript check
- full test suite
- external and inline JavaScript syntax
- duplicate-ID guard
- Telegram Mini App narrow viewport
- Telegram Mini App desktop viewport
- Home → Ask → Community → Campus → Me navigation
- Community feed/filter/search/post/reply/vote/follow/save/report/block
- Ask → student discussion bridge
- Me → planner/profile/tools/notifications
- loading, empty and failure states
- safe-area and Telegram Back/Main Button behavior
