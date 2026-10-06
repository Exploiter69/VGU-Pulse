# Gate 3 — Trusted Signal Integration

## Goal

VGU Pulse can show current, verified VGU information without coupling its database to VGU-Signal internals.

## Contract

VGU-Signal exposes:

GET /public/information?limit=N&category=CATEGORY

The response contains only:

- currently VERIFIED claims;
- currently effective information items;
- items that have not been superseded;
- presentation-safe fields including title, summary, category, scope, timing and primary official source URL.

The endpoint is bounded to 20 items and is read-only.

VGU Pulse consumes this contract server-side through SIGNAL_API_URL.

## Boundary

VGU public sources -> VGU-Signal -> verified InformationItem -> public read-only contract -> VGU-Pulse

Pulse never reads Signal's D1 directly and never changes Signal information.

## Failure behavior

If Signal is unavailable, Pulse Home still loads with participation features. Missing Signal data is not replaced with invented official information.

## Production validation

1. Deploy VGU-Signal.
2. Deploy VGU-Pulse.
3. Check /health.
4. Check Pulse /api/signal.
5. Open the Mini App and confirm verified VGU items appear under Official VGU information.

## Security/trust invariant

Pulse must preserve Signal's trust label. Student-submitted content must never be presented through this contract as official information.
