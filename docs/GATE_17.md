# Phase 17 — Notifications & Attention

Status: implementation complete; latest hardening revision pending production deployment.

Delivered:
- opt-in official VGU update notifications
- opt-in community-reply notifications
- D1-backed inbox
- duplicate-safe references
- Telegram delivery
- 15-minute Cloudflare Cron Trigger
- read state and Mini App settings controls
- current-preference filtering before delivery
- disabled-preference cleanup
- bounded scheduled delivery (18 Telegram sends per sweep)
- set-based D1 fan-out for official notifications

The sweep is intentionally bounded for the existing $0 Worker/D1/Telegram architecture. No paid service, queue, Redis, Kafka, Celery, R2 or second workflow system was added.
