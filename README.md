# VGU Pulse

VGU's student-facing campus network.

VGU Pulse is the social/participation layer built alongside VGU-Signal. VGU-Signal answers what VGU officially publishes; VGU Pulse helps students discover, participate, connect, and coordinate around campus life.

## Product boundary

- **VGU-Signal**: trusted official-information engine.
- **VGU Pulse**: student experience and social network.
- Pulse may consume trusted Signal data but does not duplicate Signal's acquisition/verification pipeline.

## Telegram surfaces

- **Bot** — personal entry point, notifications, private actions.
- **Mini App** — primary product experience.
- **Channel** — broadcast and discovery.
- **Groups/communities** — deeper conversation.

## Product pillars

1. **Discover** — notices, events, clubs, opportunities, campus information.
2. **Participate** — polls, ratings, questions, predictions, RSVPs.
3. **People** — profiles, interests, study/project/activity connections.
4. **Social** — moderated student posts, confessions, memes, presence.
5. **Connect** — coordination and mutual interactions.

## Non-goals for the foundation

VGU Pulse is not a replacement for Instagram, WhatsApp, Telegram, or VGU ERP. It will not start as an unrestricted anonymous network, public GPS tracker, random stranger chat, or open video/voice platform.

## Hard constraints

- ₹0 / $0 infrastructure and development strategy.
- No paid APIs or services.
- Prefer a simple modular architecture over microservices.
- Privacy and moderation are product requirements, not later add-ons.
- Student-submitted information must be distinguishable from official/verified information.

## Development

Architecture and implementation decisions live in `docs/`.
