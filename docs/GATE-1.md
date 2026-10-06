# Gate 1 — Telegram Shell

## Definition of done

- [x] Single Worker backend
- [x] D1 schema and binding contract
- [x] Telegram webhook endpoint
- [x] Telegram webhook secret validation
- [x] /start and /help bot flows
- [x] Mini App static shell
- [x] Server-side Telegram Mini App initData validation
- [x] Telegram identity upsert into D1
- [x] Health endpoint with D1 check
- [x] Local test/check scripts
- [x] Production D1 created
- [x] Production secrets configured
- [x] Worker deployed
- [x] Telegram webhook registered
- [x] End-to-end Telegram device test

The unchecked items are deployment actions requiring the owner's Cloudflare/Telegram credentials and cannot be safely committed as repository code.

## Runtime flow

```
Telegram
  │
  ├── /start
  │     ↓
  │   Worker /telegram/webhook
  │     ↓
  │   sendMessage()
  │     ↓
  │   Open VGU Pulse
  │
  └── Mini App
        ↓
      Worker /api/auth/telegram
        ↓
      validate initData
        ↓
      D1 users
```

## Security gate

The browser's `initDataUnsafe` is never trusted. The Mini App sends raw `initData`; the Worker validates its HMAC using the bot token before accepting the Telegram identity.

Telegram's current Mini App documentation explicitly requires server-side validation before trusting Mini App data.
