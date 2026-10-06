# VGU Pulse Architecture Contract

## System boundary

```
VGU sources
    │
    ▼
VGU-Signal
    │ trusted information
    ▼
VGU Pulse backend
    │
    ├── Telegram Bot
    ├── Telegram Mini App
    ├── Telegram Channel
    └── Telegram Groups
```

VGU-Signal remains the source of truth for its own acquisition, evidence, verification, and normalization pipeline.

Pulse owns student accounts, social content, participation, communities, matching, moderation, and product-facing APIs.

## Telegram roles

### Bot
Private/personal surface for onboarding, notifications, reminders, Mini App deep links, and private actions.

### Mini App
Primary application surface for home feed, polls, events, people, communities, profiles, and social interactions.

The Mini App authenticates Telegram users using Telegram's signed initialization data and sends only the minimum required identity context to the backend.

### Channel
Broadcast/discovery surface for important Pulse updates, selected public content, poll/result cards, events, and shareable campus moments.

The channel is not the system database.

### Groups
Community/conversation surface. Groups are optional product integrations, not the primary persistence layer.

## Backend shape

Start as a modular monolith.

Suggested modules:
- identity
- users
- feed
- polls
- events
- communities
- people
- social
- moderation
- notifications
- signal_integration
- admin

Do not introduce microservices, Redis, Kafka, Celery, Kubernetes, or a second workflow system.

## Data boundary

Pulse owns its own database.

Do not couple Pulse directly to VGU-Signal's internal tables.

Integration should use a stable, explicit interface such as exported trusted items, API endpoints, or a small read-only integration contract.

The exact interface is an implementation decision after the first architecture gate.

## Security

- Validate Telegram Mini App initialization data server-side.
- Never trust client-supplied user identity.
- Store only necessary user data.
- Use internal immutable user IDs.
- Separate public display identity from sensitive account identifiers.
- Rate-limit abuse-prone actions.
- Provide block/report controls before enabling direct social contact.
- Do not expose precise location by default.
- Do not store location history for social presence.

## Moderation

Required before unrestricted social content:
- report
- block/mute
- rate limits
- moderation queue
- audit trail
- clear content rules
- escalation path
- deletion/takedown handling

Anonymous/pseudonymous content is never exempt from moderation.

## Zero-cost requirement

Target only free/open-source/local development and free-tier infrastructure.

No paid dependency is allowed into the architecture without an explicit product decision overriding the project's $0 constraint.
