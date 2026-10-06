import {
  createStudentPost,
  createStudentReply,
  getOpenPoll,
  listStudentPosts,
  reportStudentPost,
  reportStudentReply,
  listStudentReplies,
  upsertTelegramUser,
  validateStudentPostInput,
  voteInPoll,
} from "./db";
import { sendMessage } from "./telegram-bot";
import { validateInitData } from "./telegram";

interface Env {
  DB: D1Database;
  BOT_TOKEN?: string;
  TELEGRAM_WEBAPP_URL?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  SIGNAL_API_URL?: string;
  SIGNAL_SERVICE: Fetcher;
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
      try {
        const upstream = await env.SIGNAL_SERVICE.fetch(
          new Request("https://vgu-signal-worker/public/information?limit=10", {
            headers: { accept: "application/json" },
          }),
        );
        if (!upstream.ok) return json({ ok: false, error: "signal_unavailable" }, 502);
        const payload = await upstream.json();
        return json(payload);
      } catch {
        return json({ ok: false, error: "signal_unavailable" }, 502);
      }
    }

    if (request.method === "GET" && url.pathname === "/api/student-posts") {
      try {
        const requestedCategory = url.searchParams.get("category");
        const category =
          requestedCategory === "question" ||
          requestedCategory === "info" ||
          requestedCategory === "opportunity" ||
          requestedCategory === "request"
            ? requestedCategory
            : undefined;
        const posts = await listStudentPosts(env.DB, 20, category);
        return json({
          ok: true,
          trust: "student-reported",
          category: category ?? "all",
          posts,
        });
      } catch {
        return json({ ok: false, error: "student_posts_unavailable" }, 500);
      }
    }

    if (request.method === "POST" && url.pathname === "/api/student-posts") {
      if (!env.BOT_TOKEN) return json({ ok: false, error: "bot_not_configured" }, 503);
      const initData = request.headers.get("x-telegram-init-data") ?? "";
      const validated = await validateInitData(initData, env.BOT_TOKEN);
      if (!validated) return json({ ok: false, error: "unauthorized" }, 401);
      await upsertTelegramUser(env.DB, validated.user);

      let body: { category?: unknown; title?: unknown; body?: unknown };
      try {
        body = (await request.json()) as { category?: unknown; title?: unknown; body?: unknown };
      } catch {
        return json({ ok: false, error: "invalid_json" }, 400);
      }

      const input = validateStudentPostInput(body);
      if (!input) return json({ ok: false, error: "invalid_post" }, 400);

      try {
        const post = await createStudentPost(env.DB, validated.user.id, input);
        return json({ ok: true, trust: "student-reported", post }, 201);
      } catch {
        return json({ ok: false, error: "post_create_failed" }, 500);
      }
    }

    if (request.method === "GET" && url.pathname === "/api/student-posts/replies") {
      const postId = Number(url.searchParams.get("post_id"));
      if (!Number.isSafeInteger(postId) || postId < 1) {
        return json({ ok: false, error: "invalid_post" }, 400);
      }
      try {
        const replies = await listStudentReplies(env.DB, postId);
        return json({ ok: true, trust: "student-reported", post_id: postId, replies });
      } catch {
        return json({ ok: false, error: "replies_unavailable" }, 500);
      }
    }

    if (request.method === "POST" && url.pathname === "/api/student-posts/replies") {
      if (!env.BOT_TOKEN) return json({ ok: false, error: "bot_not_configured" }, 503);
      const initData = request.headers.get("x-telegram-init-data") ?? "";
      const validated = await validateInitData(initData, env.BOT_TOKEN);
      if (!validated) return json({ ok: false, error: "unauthorized" }, 401);
      await upsertTelegramUser(env.DB, validated.user);

      let body: { post_id?: unknown; body?: unknown };
      try {
        body = (await request.json()) as { post_id?: unknown; body?: unknown };
      } catch {
        return json({ ok: false, error: "invalid_json" }, 400);
      }
      if (!Number.isSafeInteger(body.post_id) || (body.post_id as number) < 1) {
        return json({ ok: false, error: "invalid_post" }, 400);
      }
      const replyInput = validateStudentReplyInput({ body: body.body });
      if (!replyInput) return json({ ok: false, error: "invalid_reply" }, 400);

      try {
        const reply = await createStudentReply(
          env.DB,
          body.post_id as number,
          validated.user.id,
          replyInput.body,
        );
        return json({ ok: true, trust: "student-reported", reply }, 201);
      } catch (error) {
        if (error instanceof Error && error.message === "post_not_found") {
          return json({ ok: false, error: "post_not_found" }, 404);
        }
        return json({ ok: false, error: "reply_create_failed" }, 500);
      }
    }

    if (request.method === "POST" && url.pathname === "/api/student-posts/replies/report") {
      if (!env.BOT_TOKEN) return json({ ok: false, error: "bot_not_configured" }, 503);
      const initData = request.headers.get("x-telegram-init-data") ?? "";
      const validated = await validateInitData(initData, env.BOT_TOKEN);
      if (!validated) return json({ ok: false, error: "unauthorized" }, 401);
      await upsertTelegramUser(env.DB, validated.user);

      let body: { reply_id?: unknown };
      try {
        body = (await request.json()) as { reply_id?: unknown };
      } catch {
        return json({ ok: false, error: "invalid_json" }, 400);
      }
      if (!Number.isSafeInteger(body.reply_id) || (body.reply_id as number) < 1) {
        return json({ ok: false, error: "invalid_reply" }, 400);
      }
      try {
        await reportStudentReply(env.DB, body.reply_id as number, validated.user.id);
        return json({ ok: true });
      } catch {
        return json({ ok: false, error: "reply_report_failed" }, 500);
      }
    }

    if (request.method === "POST" && url.pathname === "/api/student-posts/report") {
      if (!env.BOT_TOKEN) return json({ ok: false, error: "bot_not_configured" }, 503);
      const initData = request.headers.get("x-telegram-init-data") ?? "";
      const validated = await validateInitData(initData, env.BOT_TOKEN);
      if (!validated) return json({ ok: false, error: "unauthorized" }, 401);
      await upsertTelegramUser(env.DB, validated.user);

      let body: { post_id?: unknown };
      try {
        body = (await request.json()) as { post_id?: unknown };
      } catch {
        return json({ ok: false, error: "invalid_json" }, 400);
      }
      if (!Number.isSafeInteger(body.post_id)) {
        return json({ ok: false, error: "invalid_post" }, 400);
      }

      try {
        await reportStudentPost(env.DB, body.post_id as number, validated.user.id);
        return json({ ok: true });
      } catch {
        return json({ ok: false, error: "report_failed" }, 500);
      }
    }

    if (request.method === "GET" && url.pathname === "/api/home") {
      const poll = await getOpenPoll(env.DB);
      let signalItems: Array<Record<string, unknown>> = [];
      try {
        const upstream = await env.SIGNAL_SERVICE.fetch(
          new Request("https://vgu-signal-worker/public/information?limit=10", {
            headers: { accept: "application/json" },
          }),
        );
        if (upstream.ok) {
          const payload = (await upstream.json()) as { items?: unknown[] };
          signalItems = Array.isArray(payload.items)
            ? payload.items.filter(
                (item): item is Record<string, unknown> =>
                  typeof item === "object" && item !== null,
              )
            : [];
        }
      } catch {
        signalItems = [];
      }

      const events = signalItems.filter(
        (item) =>
          item.category === "EVENT" ||
          item.category === "OPPORTUNITY" ||
          item.category === "ACTIVITY",
      );

      return json({
        ok: true,
        title: "VGU Pulse",
        tagline: "What's happening at VGU, and who can I do it with?",
        sections: [
          {
            type: "student-posts",
            title: "Student community",
            body: "Questions, useful campus information and opportunities shared by students.",
            trust: "student-reported",
            items: await listStudentPosts(env.DB),
          },
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
            type: "events",
            title: "What's happening",
            body: events.length
              ? "Verified events and opportunities from VGU sources."
              : "No verified events or opportunities are available right now.",
            trust: "official",
            items: events,
          },
          {
            type: "participate",
            title: "Campus Pulse",
            body: "Share your view through the campus poll.",
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
