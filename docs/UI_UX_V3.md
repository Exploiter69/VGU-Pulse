# VGU Pulse UX v3

## Product principle

VGU Pulse is a VGU-specific student operating layer. The UI must organize the existing product surface around student intent instead of exposing implementation-level feature names.

## Primary navigation

Five stable destinations remain:

1. Home — what matters now
2. Ask — find an answer
3. Community — talk to students
4. Campus — find a campus service
5. Me — personal student workspace

This follows the product rule that primary navigation should stay small and predictable; secondary capabilities live inside the destination that owns their mental model.

## Information architecture

### Home
- Today's important official information
- Events and opportunities
- Deadlines preview
- Campus pulse
- Community preview
- shortcuts to Ask, Community, Campus, Study, People, and Tools

### Ask
- VGU knowledge search
- popular queries
- official/student trust treatment
- source links
- Ask students bridge
- related student discussions

### Community
- For You is the default feed and prioritizes published profile branch/year, recent student activity, and unanswered cohort questions; when there is not enough personalized signal, it falls back to campus Trending.
- Latest
- Trending
- Confessions
- Campus
- Exam survival
- Saved
- topic feeds
- community discovery
- search
- contextual creation
- post detail
- replies
- voting
- follow
- save
- report
- block
- polls
- anonymous posts
- People entry point

Creation is intent-first so students choose a goal before seeing a detailed form. The first seven intents are Discussion, Question, Confession, Campus help, Exam survival, Senior advice, and Notes/resources. Less-common intents remain behind More… so publishing has one obvious primary action.

Anonymous posting keeps the notice and rules acknowledgement. Confessions and Exam survival use distinct visual treatment, and unanswered questions expose a direct Answer this action. Accepted answers and solved state are visible in both cards and reply threads.

Community also exposes dismissible, student-facing Campus Pulse summaries for today's mess ratings, the next published event, and the campus question of the day.

### Campus
- campus search
- service categories
- service results
- official student portals
- contacts/resources

### Me
- identity/profile
- activity
- study plan
- People profile
- student tools
- notifications
- community contributions
- campus poll
- Telegram controls

Secondary screens:
- Study plan
- People
- Student tools

They are reachable from Me and retain the Telegram BackButton hierarchy.

## Responsive behavior

### Mobile
- five-item fixed bottom navigation
- one-column content
- full-width feed
- horizontally scrollable secondary tabs/chips
- modal sheets/dialogs for dense actions
- Telegram safe-area insets

### Desktop/tablet
- fixed vertical primary navigation
- constrained readable content column
- Home uses a main/aside layout
- secondary screens remain full readable width
- community feed keeps social content as the primary column

## Visual system

- dark neutral campus utility palette
- one primary accent
- semantic trust colors only for meaning
- typography and whitespace create hierarchy
- cards are used for grouped modules, not every piece of content
- lists/separators are preferred for dense information
- contextual actions move into detail views or menus
- Community primary actions and controls use at least 44px touch targets
- Campus Pulse widgets are dismissible and do not become persistent clutter
- touch targets stay comfortably usable
- loading, empty, error, and success states are first-class

## Product invariants

- no backend/API redesign for the UX pass
- no private ERP/Digicampus data is fabricated
- official information remains visibly distinct from student-reported content
- anonymous content never exposes Telegram identity
- existing moderation, reporting, blocking, rate limits and privacy behavior remain intact
- no paid services are introduced
