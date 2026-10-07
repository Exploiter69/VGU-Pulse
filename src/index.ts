import {
  createStudentPost,
  deleteStudentPost,
  deleteStudentProfile,
  deleteStudentReply,
  getStudentProfile,
  getPersonalPulse,
  listStudentProfiles,
  reportStudentProfile,
  blockStudentProfile,
  unblockStudentProfile,
  setStudentProfileVisibility,
  listBlockedProfiles,
  upsertStudentProfile,
  validateStudentProfileInput,
  createStudentReply,
  getOpenPoll,
  listStudentPosts,
  reportStudentPost,
  reportStudentReply,
  listStudentReplies,
  voteStudentPost,
  voteStudentReply,
  findRelatedStudentPosts,
  upsertTelegramUser,
  validateStudentPostInput,
  validateStudentReplyInput,
  voteInPoll,
} from "./db";
import { sendMessage } from "./telegram-bot";
import { validateInitData } from "./telegram";
import { analyzeAcademicQuery, searchKnowledge } from "./intelligence";
import {
  getNotificationPreferences,
  listStudentNotifications,
  markStudentNotificationsRead,
  runNotificationSweep,
  setNotificationPreferences,
} from "./notifications";

interface Env {
  DB: D1Database;
  BOT_TOKEN?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_WEBAPP_URL?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  SIGNAL_API_URL?: string;
  SIGNAL_SERVICE: Fetcher;
  APP_NAME: string;
}

function getBotToken(env: Env): string {
  return env.BOT_TOKEN ?? env.TELEGRAM_BOT_TOKEN ?? "";
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

async function readJson<T>(request: Request, maxBytes = 32_768): Promise<T | null> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > maxBytes) return null;
  try {
    const body = (await request.json()) as T;
    return body && typeof body === "object" ? body : null;
  } catch {
    return null;
  }
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
  if (!getBotToken(env)) return json({ ok: false, error: "bot_not_configured" }, 503);

  const expected = env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected || request.headers.get("x-telegram-bot-api-secret-token") !== expected) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  const update = await readJson<{
    message?: { chat?: { id?: number }; text?: string };
  }>(request);
  if (!update) return json({ ok: false, error: "invalid_json" }, 400);

  const message = update.message;
  const chatId = message?.chat?.id;
  if (!chatId) return json({ ok: true });

  const text = (message.text ?? "").trim();

  if (text === "/start") {
    await sendMessage(
      getBotToken(env),
      chatId,
      "Welcome to VGU Pulse. Your campus network starts here.",
      env.TELEGRAM_WEBAPP_URL,
    );
  } else if (text === "/help") {
    await sendMessage(
      getBotToken(env),
      chatId,
      "Use Open VGU Pulse to enter the Mini App. More campus features will appear there as the network grows.",
      env.TELEGRAM_WEBAPP_URL,
    );
  } else {
    await sendMessage(
      getBotToken(env),
      chatId,
      "Open VGU Pulse to continue.",
      env.TELEGRAM_WEBAPP_URL,
    );
  }

  return json({ ok: true });
}

export default {
  async scheduled(_controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    try {
      const result = await runNotificationSweep(env.DB, env.SIGNAL_SERVICE, getBotToken(env), env.TELEGRAM_WEBAPP_URL);
      console.log(JSON.stringify({ event: "notification_sweep", ...result }));
    } catch (error) {
      console.error(JSON.stringify({
        event: "notification_sweep_failed",
        error: error instanceof Error ? error.message : "unknown",
      }));
    }
  },

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
      return json({ service: "vgu-pulse", status: dbOk ? "ok" : "degraded", database: dbOk }, dbOk ? 200 : 503);
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


    if (request.method === "GET" && url.pathname === "/api/students") {
      try {
        const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
        const program = (url.searchParams.get("program") ?? "").trim().slice(0, 80);
        const branch = (url.searchParams.get("branch") ?? "").trim().slice(0, 80);
        const rawYear = url.searchParams.get("year");
        const parsedYear = rawYear ? Number(rawYear) : NaN;
        const year = Number.isInteger(parsedYear) && parsedYear >= 1 && parsedYear <= 6
          ? parsedYear
          : undefined;
        let viewerId: number | undefined;
        const initData = request.headers.get("x-telegram-init-data") ?? "";
        if (initData && getBotToken(env)) {
          const validated = await validateInitData(initData, getBotToken(env));
          if (validated) viewerId = validated.user.id;
        }
        const profiles = await listStudentProfiles(env.DB, 30, viewerId, {
          q,
          program,
          branch,
          year,
        });
        return json({ ok: true, trust: "student-reported", profiles });
      } catch { return json({ ok: false, error: "student_profiles_unavailable" }, 500); }
    }

    if (request.method === "POST" && url.pathname === "/api/student-profile/visibility") {
      if (!getBotToken(env)) return json({ ok: false, error: "bot_not_configured" }, 503);
      const validated = await validateInitData(request.headers.get("x-telegram-init-data") ?? "", getBotToken(env));
      if (!validated) return json({ ok: false, error: "unauthorized" }, 401);
      const body = await readJson<{ visible?: unknown }>(request);
      if (!body) return json({ ok: false, error: "invalid_json" }, 400);
      if (typeof body.visible !== "boolean") return json({ ok: false, error: "invalid_visibility" }, 400);
      return json({ ok: true, visible: await setStudentProfileVisibility(env.DB, validated.user.id, body.visible) });
    }

    if (request.method === "POST" && url.pathname === "/api/student-profile/block") {
      if (!getBotToken(env)) return json({ ok: false, error: "bot_not_configured" }, 503);
      const validated = await validateInitData(request.headers.get("x-telegram-init-data") ?? "", getBotToken(env));
      if (!validated) return json({ ok: false, error: "unauthorized" }, 401);
      const body = await readJson<{ public_id?: unknown }>(request);
      if (!body) return json({ ok: false, error: "invalid_json" }, 400);
      if (typeof body.public_id !== "string" || body.public_id.length > 100) return json({ ok: false, error: "invalid_profile" }, 400);
      return json({ ok: true, blocked: await blockStudentProfile(env.DB, validated.user.id, body.public_id) });
    }

    if (request.method === "POST" && url.pathname === "/api/student-profile/unblock") {
      if (!getBotToken(env)) return json({ ok: false, error: "bot_not_configured" }, 503);
      const validated = await validateInitData(request.headers.get("x-telegram-init-data") ?? "", getBotToken(env));
      if (!validated) return json({ ok: false, error: "unauthorized" }, 401);
      let body: { public_id?: unknown };
      try { body = (await request.json()) as { public_id?: unknown }; } catch { return json({ ok: false, error: "invalid_json" }, 400); }
      if (typeof body.public_id !== "string" || body.public_id.length > 100) return json({ ok: false, error: "invalid_profile" }, 400);
      return json({ ok: true, unblocked: await unblockStudentProfile(env.DB, validated.user.id, body.public_id) });
    }

    if (request.method === "GET" && url.pathname === "/api/student-profile/blocks") {
      if (!getBotToken(env)) return json({ ok: false, error: "bot_not_configured" }, 503);
      const validated = await validateInitData(request.headers.get("x-telegram-init-data") ?? "", getBotToken(env));
      if (!validated) return json({ ok: false, error: "unauthorized" }, 401);
      return json({ ok: true, profiles: await listBlockedProfiles(env.DB, validated.user.id) });
    }

    if (request.method === "GET" && url.pathname === "/api/me/notifications") {
      if (!getBotToken(env)) return json({ ok: false, error: "bot_not_configured" }, 503);
      const validated = await validateInitData(request.headers.get("x-telegram-init-data") ?? "", getBotToken(env));
      if (!validated) return json({ ok: false, error: "unauthorized" }, 401);
      try {
        const [preferences, notifications] = await Promise.all([
          getNotificationPreferences(env.DB, validated.user.id),
          listStudentNotifications(env.DB, validated.user.id, 30),
        ]);
        return json({ ok: true, preferences, notifications });
      } catch {
        return json({ ok: false, error: "notifications_unavailable" }, 500);
      }
    }

    if (request.method === "POST" && url.pathname === "/api/me/notifications") {
      if (!getBotToken(env)) return json({ ok: false, error: "bot_not_configured" }, 503);
      const validated = await validateInitData(request.headers.get("x-telegram-init-data") ?? "", getBotToken(env));
      if (!validated) return json({ ok: false, error: "unauthorized" }, 401);
      const body = await readJson<{ official_updates?: unknown; community_replies?: unknown }>(request);
      if (!body) return json({ ok: false, error: "invalid_json" }, 400);
      if (body.official_updates !== undefined && typeof body.official_updates !== "boolean") return json({ ok: false, error: "invalid_official_updates" }, 400);
      if (body.community_replies !== undefined && typeof body.community_replies !== "boolean") return json({ ok: false, error: "invalid_community_replies" }, 400);
      try {
        const preferences = await setNotificationPreferences(env.DB, validated.user.id, {
          official_updates: body.official_updates as boolean | undefined,
          community_replies: body.community_replies as boolean | undefined,
        });
        return json({ ok: true, preferences });
      } catch {
        return json({ ok: false, error: "notification_preferences_failed" }, 500);
      }
    }

    if (request.method === "POST" && url.pathname === "/api/me/notifications/read") {
      if (!getBotToken(env)) return json({ ok: false, error: "bot_not_configured" }, 503);
      const validated = await validateInitData(request.headers.get("x-telegram-init-data") ?? "", getBotToken(env));
      if (!validated) return json({ ok: false, error: "unauthorized" }, 401);
      try {
        await markStudentNotificationsRead(env.DB, validated.user.id);
        return json({ ok: true });
      } catch {
        return json({ ok: false, error: "notification_read_failed" }, 500);
      }
    }

    if (request.method === "GET" && url.pathname === "/api/community/insights") {
      try {
        const [newest, useful, unanswered] = await Promise.all([
          listStudentPosts(env.DB, 8, undefined, undefined, "newest"),
          listStudentPosts(env.DB, 8, undefined, undefined, "useful"),
          listStudentPosts(env.DB, 8, undefined, undefined, "unanswered"),
        ]);
        const seen = new Set<number>();
        const topics = [...useful, ...unanswered, ...newest].filter((post) => {
          if (seen.has(post.id)) return false;
          seen.add(post.id);
          return true;
        }).slice(0, 12);
        return json({
          ok: true,
          trust: "student-reported",
          insights: { unanswered: unanswered.slice(0, 5), useful: useful.slice(0, 5), recent: newest.slice(0, 5), topics },
        });
      } catch {
        return json({ ok: false, error: "community_insights_unavailable" }, 500);
      }
    }

    if (request.method === "GET" && url.pathname === "/api/me/pulse") {
      if (!getBotToken(env)) return json({ ok: false, error: "bot_not_configured" }, 503);
      const validated = await validateInitData(request.headers.get("x-telegram-init-data") ?? "", getBotToken(env));
      if (!validated) return json({ ok: false, error: "unauthorized" }, 401);
      try {
        return json({ ok: true, trust: "student-reported", pulse: await getPersonalPulse(env.DB, validated.user.id) });
      } catch {
        return json({ ok: false, error: "personal_pulse_unavailable" }, 500);
      }
    }

    if (request.method === "GET" && url.pathname === "/api/student-profile") {
      if (!getBotToken(env)) return json({ ok: false, error: "bot_not_configured" }, 503);
      const validated = await validateInitData(request.headers.get("x-telegram-init-data") ?? "", getBotToken(env));
      if (!validated) return json({ ok: false, error: "unauthorized" }, 401);
      return json({ ok: true, trust: "student-reported", profile: await getStudentProfile(env.DB, validated.user.id) });
    }

    if (request.method === "POST" && url.pathname === "/api/student-profile") {
      if (!getBotToken(env)) return json({ ok: false, error: "bot_not_configured" }, 503);
      const validated = await validateInitData(request.headers.get("x-telegram-init-data") ?? "", getBotToken(env));
      if (!validated) return json({ ok: false, error: "unauthorized" }, 401);
      await upsertTelegramUser(env.DB, validated.user);
      const body = await readJson<Record<string, unknown>>(request);
      if (!body) return json({ ok: false, error: "invalid_json" }, 400);
      const input = validateStudentProfileInput(body);
      if (!input) return json({ ok: false, error: "invalid_profile" }, 400);
      try {
        return json({ ok: true, trust: "student-reported", profile: await upsertStudentProfile(env.DB, validated.user.id, input) });
      } catch { return json({ ok: false, error: "profile_save_failed" }, 500); }
    }

    if (request.method === "DELETE" && url.pathname === "/api/student-profile") {
      if (!getBotToken(env)) return json({ ok: false, error: "bot_not_configured" }, 503);
      const validated = await validateInitData(request.headers.get("x-telegram-init-data") ?? "", getBotToken(env));
      if (!validated) return json({ ok: false, error: "unauthorized" }, 401);
      try {
        const deleted = await deleteStudentProfile(env.DB, validated.user.id);
        return json({ ok: true, deleted });
      } catch {
        return json({ ok: false, error: "profile_delete_failed" }, 500);
      }
    }

    if (request.method === "POST" && url.pathname === "/api/student-profile/report") {
      if (!getBotToken(env)) return json({ ok: false, error: "bot_not_configured" }, 503);
      const validated = await validateInitData(request.headers.get("x-telegram-init-data") ?? "", getBotToken(env));
      if (!validated) return json({ ok: false, error: "unauthorized" }, 401);
      const body = await readJson<{ profile_public_id?: unknown }>(request);
      if (!body) return json({ ok: false, error: "invalid_json" }, 400);
      if (typeof body.profile_public_id !== "string" || !body.profile_public_id.trim()) return json({ ok: false, error: "invalid_profile" }, 400);
      try {
        await reportStudentProfile(env.DB, body.profile_public_id, validated.user.id);
        return json({ ok: true });
      } catch (error) {
        if (error instanceof Error && error.message === "rate_limited") {
          return json({ ok: false, error: "rate_limited" }, 429);
        }
        return json({ ok: false, error: "profile_report_failed" }, 500);
      }
    }

    if (request.method === "GET" && url.pathname === "/api/student-posts") {
      try {
        const requestedCategory = url.searchParams.get("category");
        const requestedSort = url.searchParams.get("sort");
        const sort = requestedSort === "active" || requestedSort === "unanswered" || requestedSort === "useful" ? requestedSort : "newest";
        const category =
          requestedCategory === "question" ||
          requestedCategory === "info" ||
          requestedCategory === "opportunity" ||
          requestedCategory === "request"
            ? requestedCategory
            : undefined;
        let viewerId: number | undefined;
        const initData = request.headers.get("x-telegram-init-data") ?? "";
        if (initData && getBotToken(env)) {
          const validated = await validateInitData(initData, getBotToken(env));
          viewerId = validated?.user.id;
        }
        const posts = await listStudentPosts(env.DB, 20, category, viewerId, sort);
        return json({
          ok: true,
          trust: "student-reported",
          category: category ?? "all",
          sort,
          posts,
        });
      } catch {
        return json({ ok: false, error: "student_posts_unavailable" }, 500);
      }
    }

    if (request.method === "POST" && url.pathname === "/api/student-posts/vote") {
      if (!getBotToken(env)) return json({ ok: false, error: "bot_not_configured" }, 503);
      const validated = await validateInitData(request.headers.get("x-telegram-init-data") ?? "", getBotToken(env));
      if (!validated) return json({ ok: false, error: "unauthorized" }, 401);
      const body = await readJson<{ post_id?: unknown; vote?: unknown }>(request);
      if (!body) return json({ ok: false, error: "invalid_json" }, 400);
      const postId = Number(body.post_id);
      if (!Number.isSafeInteger(postId) || postId < 1 || (body.vote !== 1 && body.vote !== -1)) return json({ ok: false, error: "invalid_vote" }, 400);
      try {
        await voteStudentPost(env.DB, postId, validated.user.id, body.vote as -1 | 1);
        const posts = await listStudentPosts(env.DB, 20, undefined, validated.user.id, "newest");
        return json({ ok: true, post: posts.find((item) => item.id === postId) });
      } catch (error) {
        if (error instanceof Error && error.message === "post_not_found") return json({ ok: false, error: "post_not_found" }, 404);
        return json({ ok: false, error: "vote_failed" }, 500);
      }
    }

    if (request.method === "GET" && url.pathname === "/api/student-posts/related") {
      const postId = Number(url.searchParams.get("post_id"));
      if (!Number.isSafeInteger(postId) || postId < 1) return json({ ok: false, error: "invalid_post" }, 400);
      try {
        const source = await env.DB.prepare("SELECT title, body FROM student_posts WHERE id = ? AND status = 'published'").bind(postId).first<{ title: string; body: string }>();
        if (!source) return json({ ok: false, error: "post_not_found" }, 404);
        const related = await findRelatedStudentPosts(env.DB, source.title, source.body, postId);
        return json({ ok: true, trust: "student-reported", posts: related });
      } catch { return json({ ok: false, error: "related_posts_unavailable" }, 500); }
    }

    if (request.method === "POST" && url.pathname === "/api/student-posts") {
      if (!getBotToken(env)) return json({ ok: false, error: "bot_not_configured" }, 503);
      const initData = request.headers.get("x-telegram-init-data") ?? "";
      const validated = await validateInitData(initData, getBotToken(env));
      if (!validated) return json({ ok: false, error: "unauthorized" }, 401);
      await upsertTelegramUser(env.DB, validated.user);

      const body = await readJson<{ category?: unknown; title?: unknown; body?: unknown }>(request);
      if (!body) return json({ ok: false, error: "invalid_json" }, 400);

      const input = validateStudentPostInput(body);
      if (!input) return json({ ok: false, error: "invalid_post" }, 400);

      try {
        const post = await createStudentPost(env.DB, validated.user.id, input);
        return json({ ok: true, trust: "student-reported", post }, 201);
      } catch (error) {
        if (error instanceof Error && error.message === "rate_limited") {
          return json({ ok: false, error: "rate_limited" }, 429);
        }
        return json({ ok: false, error: "post_create_failed" }, 500);
      }
    }

    if (request.method === "GET" && url.pathname === "/api/student-posts/replies") {
      const postId = Number(url.searchParams.get("post_id"));
      if (!Number.isSafeInteger(postId) || postId < 1) {
        return json({ ok: false, error: "invalid_post" }, 400);
      }
      try {
        let viewerId: number | undefined;
        const initData = request.headers.get("x-telegram-init-data") ?? "";
        if (initData && getBotToken(env)) {
          const validated = await validateInitData(initData, getBotToken(env));
          viewerId = validated?.user.id;
        }
        const replies = await listStudentReplies(env.DB, postId, 50, viewerId);
        return json({ ok: true, trust: "student-reported", post_id: postId, replies });
      } catch {
        return json({ ok: false, error: "replies_unavailable" }, 500);
      }
    }

    if (request.method === "DELETE" && url.pathname === "/api/student-posts") {
      if (!getBotToken(env)) return json({ ok: false, error: "bot_not_configured" }, 503);
      const validated = await validateInitData(request.headers.get("x-telegram-init-data") ?? "", getBotToken(env));
      if (!validated) return json({ ok: false, error: "unauthorized" }, 401);
      const postId = Number(url.searchParams.get("post_id"));
      if (!Number.isSafeInteger(postId) || postId < 1) {
        return json({ ok: false, error: "invalid_post" }, 400);
      }
      try {
        const deleted = await deleteStudentPost(env.DB, postId, validated.user.id);
        return json({ ok: true, deleted });
      } catch {
        return json({ ok: false, error: "post_delete_failed" }, 500);
      }
    }

    if (request.method === "POST" && url.pathname === "/api/student-posts/replies/vote") {
      if (!getBotToken(env)) return json({ ok: false, error: "bot_not_configured" }, 503);
      const validated = await validateInitData(request.headers.get("x-telegram-init-data") ?? "", getBotToken(env));
      if (!validated) return json({ ok: false, error: "unauthorized" }, 401);
      const body = await readJson<{ reply_id?: unknown; vote?: unknown }>(request);
      if (!body) return json({ ok: false, error: "invalid_json" }, 400);
      const replyId = Number(body.reply_id);
      if (!Number.isSafeInteger(replyId) || replyId < 1 || (body.vote !== 1 && body.vote !== -1)) return json({ ok: false, error: "invalid_vote" }, 400);
      try {
        await voteStudentReply(env.DB, replyId, validated.user.id, body.vote as -1 | 1);
        const owner = await env.DB.prepare("SELECT post_id FROM student_post_replies WHERE id = ?").bind(replyId).first<{ post_id: number }>();
        const replies = owner ? await listStudentReplies(env.DB, owner.post_id, 50, validated.user.id) : [];
        return json({ ok: true, reply: replies.find((item) => item.id === replyId) });
      } catch (error) {
        if (error instanceof Error && error.message === "reply_not_found") return json({ ok: false, error: "reply_not_found" }, 404);
        return json({ ok: false, error: "vote_failed" }, 500);
      }
    }

    if (request.method === "POST" && url.pathname === "/api/student-posts/replies") {
      if (!getBotToken(env)) return json({ ok: false, error: "bot_not_configured" }, 503);
      const initData = request.headers.get("x-telegram-init-data") ?? "";
      const validated = await validateInitData(initData, getBotToken(env));
      if (!validated) return json({ ok: false, error: "unauthorized" }, 401);
      await upsertTelegramUser(env.DB, validated.user);

      const body = await readJson<{ post_id?: unknown; body?: unknown }>(request);
      if (!body) return json({ ok: false, error: "invalid_json" }, 400);
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
        if (error instanceof Error && error.message === "rate_limited") {
          return json({ ok: false, error: "rate_limited" }, 429);
        }
        return json({ ok: false, error: "reply_create_failed" }, 500);
      }
    }

    if (request.method === "DELETE" && url.pathname === "/api/student-posts/replies") {
      if (!getBotToken(env)) return json({ ok: false, error: "bot_not_configured" }, 503);
      const validated = await validateInitData(request.headers.get("x-telegram-init-data") ?? "", getBotToken(env));
      if (!validated) return json({ ok: false, error: "unauthorized" }, 401);
      const replyId = Number(url.searchParams.get("reply_id"));
      if (!Number.isSafeInteger(replyId) || replyId < 1) {
        return json({ ok: false, error: "invalid_reply" }, 400);
      }
      try {
        const deleted = await deleteStudentReply(env.DB, replyId, validated.user.id);
        return json({ ok: true, deleted });
      } catch {
        return json({ ok: false, error: "reply_delete_failed" }, 500);
      }
    }

    if (request.method === "POST" && url.pathname === "/api/student-posts/replies/report") {
      if (!getBotToken(env)) return json({ ok: false, error: "bot_not_configured" }, 503);
      const initData = request.headers.get("x-telegram-init-data") ?? "";
      const validated = await validateInitData(initData, getBotToken(env));
      if (!validated) return json({ ok: false, error: "unauthorized" }, 401);
      await upsertTelegramUser(env.DB, validated.user);

      const body = await readJson<{ reply_id?: unknown }>(request);
      if (!body) return json({ ok: false, error: "invalid_json" }, 400);
      if (!Number.isSafeInteger(body.reply_id) || (body.reply_id as number) < 1) {
        return json({ ok: false, error: "invalid_reply" }, 400);
      }
      try {
        await reportStudentReply(env.DB, body.reply_id as number, validated.user.id);
        return json({ ok: true });
      } catch (error) {
        if (error instanceof Error && error.message === "rate_limited") {
          return json({ ok: false, error: "rate_limited" }, 429);
        }
        return json({ ok: false, error: "reply_report_failed" }, 500);
      }
    }

    if (request.method === "POST" && url.pathname === "/api/student-posts/report") {
      if (!getBotToken(env)) return json({ ok: false, error: "bot_not_configured" }, 503);
      const initData = request.headers.get("x-telegram-init-data") ?? "";
      const validated = await validateInitData(initData, getBotToken(env));
      if (!validated) return json({ ok: false, error: "unauthorized" }, 401);
      await upsertTelegramUser(env.DB, validated.user);

      const body = await readJson<{ post_id?: unknown }>(request);
      if (!body) return json({ ok: false, error: "invalid_json" }, 400);
      if (!Number.isSafeInteger(body.post_id)) {
        return json({ ok: false, error: "invalid_post" }, 400);
      }

      try {
        await reportStudentPost(env.DB, body.post_id as number, validated.user.id);
        return json({ ok: true });
      } catch (error) {
        if (error instanceof Error && error.message === "rate_limited") {
          return json({ ok: false, error: "rate_limited" }, 429);
        }
        return json({ ok: false, error: "report_failed" }, 500);
      }
    }

    if (request.method === "GET" && url.pathname === "/api/search") {
      const query = (url.searchParams.get("q") ?? "").trim().slice(0, 160);
      try {
        const official: Array<Record<string, unknown>> = [];
        try {
          const upstream = await env.SIGNAL_SERVICE.fetch(
            new Request("https://vgu-signal-worker/public/information?limit=20", {
              headers: { accept: "application/json" },
            }),
          );
          if (upstream.ok) {
            const payload = (await upstream.json()) as { items?: unknown[] };
            if (Array.isArray(payload.items)) {
              for (const item of payload.items) {
                if (typeof item === "object" && item !== null) official.push(item as Record<string, unknown>);
              }
            }
          }
        } catch {}
        const student = await listStudentPosts(env.DB, 20);
        const analysis = analyzeAcademicQuery(query);
        return json({
          ok: true,
          query,
          intent: analysis.intent,
          intent_label: analysis.label,
          boundary: analysis.boundary,
          results: searchKnowledge(query, official, student),
        });
      } catch {
        return json({ ok: false, error: "search_unavailable" }, 500);
      }
    }

    if (request.method === "GET" && url.pathname === "/api/home") {
      let poll = null;
      try {
        poll = await getOpenPoll(env.DB);
      } catch {
        poll = null;
      }
      let communityItems: Awaited<ReturnType<typeof listStudentPosts>> = [];
      try {
        communityItems = await listStudentPosts(env.DB);
      } catch {
        communityItems = [];
      }
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
            items: communityItems,
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
      if (!getBotToken(env)) return json({ ok: false, error: "bot_not_configured" }, 503);
      const validated = await validateInitData(initData, getBotToken(env));
      if (!validated) return json({ ok: false, error: "unauthorized" }, 401);
      await upsertTelegramUser(env.DB, validated.user);

      const body = await readJson<{ poll_id?: unknown; option_id?: unknown }>(request);
      if (!body) return json({ ok: false, error: "invalid_json" }, 400);

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
      if (!getBotToken(env)) return json({ ok: false, error: "bot_not_configured" }, 503);

      const body = await readJson<{ initData?: unknown }>(request);
      if (!body || typeof body.initData !== "string" || body.initData.length > 8192) {
        return json({ ok: false, error: "invalid_init_data" }, 400);
      }
      const validated = await validateInitData(body.initData, getBotToken(env));
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
