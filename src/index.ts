import { getOpenPoll, upsertTelegramUser, voteInPoll } from "./db";
import { sendMessage } from "./telegram-bot";
import { validateInitData } from "./telegram";

interface Env {
  DB: D1Database;
  BOT_TOKEN?: string;
  TELEGRAM_WEBAPP_URL?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  APP_NAME: string;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function html(): Response {
  return new Response(
    `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VGU Pulse</title></head>
<body style="font-family:system-ui;max-width:720px;margin:48px auto;padding:20px">
<h1>VGU Pulse</h1><p>Open this page from Telegram to enter the Pulse Mini App.</p>
</body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

async function handleTelegramUpdate(request: Request, env: Env): Promise<Response> {
  if (!env.BOT_TOKEN) return json({ ok: false, error: "bot_not_configured" }, 503);

  const expected = env.TELEGRAM_WEBHOOK_SECRET;
  if (expected && request.headers.get("x-telegram-bot-api-secret-token") !== expected) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  const update = (await request.json()) as {
    message?: { chat?: { id?: number }; text?: string };
  };

  const message = update.message;
  const chatId = message?.chat?.id;
  if (!chatId) return json({ ok: true });

  const text = (message.text ?? "").trim();

  if (text === "/start") {
    await sendMessage(
      env.BOT_TOKEN,
      chatId,
      "Welcome to VGU Pulse. Your campus network starts here.",
      env.TELEGRAM_WEBAPP_URL,
    );
  } else if (text === "/help") {
    await sendMessage(
      env.BOT_TOKEN,
      chatId,
      "Use Open VGU Pulse to enter the Mini App. More campus features will appear there as the network grows.",
      env.TELEGRAM_WEBAPP_URL,
    );
  } else {
    await sendMessage(
      env.BOT_TOKEN,
      chatId,
      "Open VGU Pulse to continue.",
      env.TELEGRAM_WEBAPP_URL,
    );
  }

  return json({ ok: true });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") return html();

    if (request.method === "GET" && url.pathname === "/health") {
      let dbOk = false;
      try {
        await env.DB.prepare("SELECT 1").first();
        dbOk = true;
      } catch {
        dbOk = false;
      }
      return json({ service: "vgu-pulse", status: "ok", database: dbOk });
    }

    if (request.method === "POST" && url.pathname === "/telegram/webhook") {
      return handleTelegramUpdate(request, env);
    }

    if (request.method === "GET" && url.pathname === "/api/signal") {
      const signalUrl = env.SIGNAL_API_URL;
      if (!signalUrl) return json({ ok: false, error: "signal_not_configured" }, 503);
      try {
        const upstream = await fetch(new URL("/public/information?limit=10", signalUrl), {
          headers: { accept: "application/json" },
        });
        if (!upstream.ok) return json({ ok: false, error: "signal_unavailable" }, 502);
        const payload = await upstream.json();
        return json(payload);
      } catch {
        return json({ ok: false, error: "signal_unavailable" }, 502);
      }
    }

    if (request.method === "GET" && url.pathname === "/api/home") {
      const poll = await getOpenPoll(env.DB);
      let signalItems: unknown[] = [];
      if (env.SIGNAL_API_URL) {
        try {
          const upstream = await fetch(new URL("/public/information?limit=5", env.SIGNAL_API_URL), {
            headers: { accept: "application/json" },
          });
          if (upstream.ok) {
            const payload = (await upstream.json()) as { items?: unknown[] };
            signalItems = Array.isArray(payload.items) ? payload.items : [];
          }
        } catch {
          signalItems = [];
        }
      }

      return json({
        ok: true,
        title: "VGU Pulse",
        tagline: "What's happening at VGU, and who can I do it with?",
        sections: [
          {
            type: "notice",
            title: "Official VGU information",
            body: signalItems.length
              ? "Verified VGU information from VGU Signal."
              : "No verified VGU information is available right now.",
            trust: "official",
            items: signalItems,
          },
          {
            type: "today",
            title: "Today at VGU",
            body: "Events, activities and opportunities will become discoverable here.",
            trust: "verified",
          },
          {
            type: "participate",
            title: "Participate",
            body: "Your first campus signal is the daily poll below.",
          },
        ],
        poll,
      });
    }

    if (request.method === "POST" && url.pathname === "/api/polls/vote") {
      const initData = request.headers.get("x-telegram-init-data") ?? "";
      if (!env.BOT_TOKEN) return json({ ok: false, error: "bot_not_configured" }, 503);
      const validated = await validateInitData(initData, env.BOT_TOKEN);
      if (!validated) return json({ ok: false, error: "unauthorized" }, 401);
      await upsertTelegramUser(env.DB, validated.user);

      let body: { poll_id?: number; option_id?: number };
      try {
        body = (await request.json()) as { poll_id?: number; option_id?: number };
      } catch {
        return json({ ok: false, error: "invalid_json" }, 400);
      }

      if (!Number.isSafeInteger(body.poll_id) || !Number.isSafeInteger(body.option_id)) {
        return json({ ok: false, error: "invalid_vote" }, 400);
      }

      const pollId = body.poll_id as number;
      const optionId = body.option_id as number;

      try {
        await voteInPoll(env.DB, pollId, optionId, validated.user.id);
      } catch (error) {
        if (error instanceof Error && error.message === "invalid_option") {
          return json({ ok: false, error: "invalid_option" }, 400);
        }
        return json({ ok: false, error: "vote_failed" }, 500);
      }

      return json({ ok: true, poll: await getOpenPoll(env.DB, validated.user.id) });
    }

    if (request.method === "POST" && url.pathname === "/api/auth/telegram") {
      if (!env.BOT_TOKEN) return json({ ok: false, error: "bot_not_configured" }, 503);

      const body = (await request.json()) as { initData?: string };
      const validated = await validateInitData(body.initData ?? "", env.BOT_TOKEN);
      if (!validated) return json({ ok: false, error: "invalid_init_data" }, 401);

      await upsertTelegramUser(env.DB, validated.user);

      return json({
        ok: true,
        user: {
          id: validated.user.id,
          username: validated.user.username ?? null,
          first_name: validated.user.first_name ?? null,
          last_name: validated.user.last_name ?? null,
        },
      });
    }

    return json({ ok: false, error: "not_found" }, 404);
  },
};
