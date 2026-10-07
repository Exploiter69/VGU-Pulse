# Phase 22 — Observability & Reliability

Status: implementation complete; deployment validation pending.

Health now returns HTTP 503 when D1 is unavailable. Home isolates D1 poll/community failures from Signal failures. Signal failure remains non-fatal. Notification sweeps emit structured operational events and delivery failures remain retryable. GitHub Actions now runs typecheck and tests on pushes and pull requests.

No paid observability infrastructure was added.
