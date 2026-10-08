import {
  createStudentPost,
  deleteStudentPost,
  deleteStudentProfile,
  deleteAllStudentData,
  setStudentContactEnabled,
  deleteStudentReply,
  getStudentProfile,
  getPersonalPulse,
  listStudentProfiles,
  reportStudentProfile,
  blockStudentProfile,
  unblockStudentProfile,
  setStudentProfileVisibility,
  listBlockedProfiles,
  unblockStudentProfileBlock,
  upsertStudentProfile,
  validateStudentProfileInput,
  createStudentReply,
  getOpenPoll,
  listStudentPosts,
  getStudentPostById,
  getStudentReplyById,
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
import { handleCommunityV2 } from "./community-v2";
import { handleFeaturesV4 } from "./features-v4";
import { requireUser as requireHttpUser } from "./http";
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
  ADMIN_IDS?: string;
  ANON_ALIAS_SECRET?: string;
  PULSE_CHANNEL_ID?: string;
}

function getBotToken(env: Env): string {
  return env.BOT_TOKEN ?? env.TELEGRAM_BOT_TOKEN ?? "";
}
function adminIds(raw?:string):Set<string>{return new Set((raw??"").split(",").map(x=>x.trim()).filter(Boolean));}
function isAdmin(env:Env,userId:number):boolean{return adminIds(env.ADMIN_IDS).has(String(userId));}
let cachedBotUsername:{value:string;expiresAt:number}|null=null;

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
    message?: { from?: { id?: number }; chat?: { id?: number }; text?: string; caption?: string; document?: { file_id?: string; file_unique_id?: string; file_name?: string; mime_type?: string; file_size?: number } };
  }>(request);
  if (!update) return json({ ok: false, error: "invalid_json" }, 400);

  const message = update.message;
  const chatId = message?.chat?.id;
  if (!chatId) return json({ ok: true });

  const text = (message.text ?? "").trim();
  const senderId=message.from?.id ?? chatId;
  if(message.document && (message.caption??"").trim().startsWith("/resource")){
    const d=message.document;
    if(!d.file_id||!d.file_name)return json({ok:true});
    await env.DB.prepare("INSERT INTO resources(telegram_user_id,file_id,file_unique_id,name,mime_type,size_bytes,subject,semester,resource_type,status) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(String(senderId),d.file_id,d.file_unique_id??null,d.file_name,d.mime_type??null,Number.isSafeInteger(d.file_size)?d.file_size:null,null,null,"other","pending").run();
    await sendMessage(getBotToken(env),chatId,"Resource received. It is pending moderation before students can access it.",env.TELEGRAM_WEBAPP_URL);
    return json({ok:true});
  }
  if(isAdmin(env,senderId) && text==="/review"){
    const rows=await env.DB.prepare("SELECT id,kind,title,report_count FROM community_items WHERE status='review' ORDER BY created_at ASC LIMIT 20").all();
    await sendMessage(getBotToken(env),chatId,rows.results?.length?rows.results.map((x:any)=>`#${x.id} [${x.kind}] reports=${x.report_count} ${x.title}`).join("\n"):"No items awaiting review.",env.TELEGRAM_WEBAPP_URL);
    return json({ok:true});
  }
  const moderation=text.match(/^\/(restore|hide|ban)\s+(\d+)$/);
  if(isAdmin(env,senderId)&&moderation){
    const [,action,target]=moderation;
    if(action==="ban") await env.DB.prepare("INSERT INTO user_bans(telegram_user_id,reason,banned_by) VALUES(?,?,?) ON CONFLICT(telegram_user_id) DO UPDATE SET reason=excluded.reason,banned_by=excluded.banned_by,created_at=CURRENT_TIMESTAMP").bind(target,"Telegram moderation command",String(senderId)).run();
    else await env.DB.prepare("UPDATE community_items SET status=? WHERE id=?").bind(action==="restore"?"published":"hidden",Number(target)).run();
    await env.DB.prepare("INSERT INTO moderation_actions(admin_telegram_user_id,action,target_type,target_id,reason) VALUES(?,?,?,?,?)").bind(String(senderId),action,action==="ban"?"user":"item",target,"Telegram moderation command").run();
    await sendMessage(getBotToken(env),chatId,`Moderation action applied: /${action} ${target}`,env.TELEGRAM_WEBAPP_URL);
    return json({ok:true});
  }

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
  async scheduled(controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    try {
      const result = await runNotificationSweep(env.DB, env.SIGNAL_SERVICE, getBotToken(env), env.TELEGRAM_WEBAPP_URL);
      const weeklyTime=new Date(controller.scheduledTime); const weeklyWindow=weeklyTime.getUTCDay()===1 && weeklyTime.getUTCHours()===4 && weeklyTime.getUTCMinutes()<15;
      if(env.PULSE_CHANNEL_ID&&weeklyWindow){
        const rows=await env.DB.prepare("SELECT i.id,i.title,(SELECT COUNT(*) FROM community_votes v WHERE v.item_id=i.id AND v.vote=1) upvotes,(SELECT COUNT(*) FROM community_replies r WHERE r.item_id=i.id AND r.status='published') replies,(SELECT COUNT(*) FROM community_votes v WHERE v.item_id=i.id AND v.vote=-1) downvotes FROM community_items i WHERE i.status='published' ORDER BY (upvotes+2*replies-downvotes) DESC,i.created_at DESC LIMIT 5").all<{id:number;title:string;upvotes:number;replies:number}>();
        if(rows.results?.length){
          const digest="VGU Pulse — weekly top threads\\n\\n"+rows.results.map((x,i)=>(i+1)+". "+x.title+" ("+x.upvotes+" helpful, "+x.replies+" replies)").join("\\n");
          await sendMessage(getBotToken(env),Number(env.PULSE_CHANNEL_ID),digest,env.TELEGRAM_WEBAPP_URL);
        }
      }
      const reminderRows=await env.DB.prepare("SELECT er.event_id,er.telegram_user_id,e.title,e.starts_at,e.location FROM event_reminders er JOIN campus_events e ON e.id=er.event_id WHERE er.enabled=1 AND er.sent_at IS NULL AND e.status='published' AND e.starts_at>CURRENT_TIMESTAMP AND e.starts_at<=datetime('now','+60 minutes') ORDER BY e.starts_at LIMIT 18").all<{event_id:number;telegram_user_id:string;title:string;starts_at:string;location:string|null}>();
      const reminderUpdates:D1PreparedStatement[]=[];
      for(const r of reminderRows.results??[]){
        try{
          const message="Reminder: "+r.title+" starts at "+r.starts_at+(r.location?" · "+r.location:"");
          const sent=await sendMessage(getBotToken(env),Number(r.telegram_user_id),message,env.TELEGRAM_WEBAPP_URL);
          if(sent)reminderUpdates.push(env.DB.prepare("UPDATE event_reminders SET sent_at=CURRENT_TIMESTAMP WHERE event_id=? AND telegram_user_id=?").bind(r.event_id,r.telegram_user_id));
        }catch{}
      }
      if(reminderUpdates.length)await env.DB.batch(reminderUpdates);
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
      let signalOk = false;
      try {
        await env.DB.prepare("SELECT 1").first();
        dbOk = true;
      } catch {}
      try {
        const upstream = await env.SIGNAL_SERVICE.fetch(
          new Request("https://vgu-signal-worker/health", { headers: { accept: "application/json" } }),
        );
        signalOk = upstream.ok;
      } catch {}
      const healthy = dbOk && signalOk;
      return json({
        service: "vgu-pulse",
        status: healthy ? "ok" : "degraded",
        dependencies: { database: dbOk, signal: signalOk },
      }, healthy ? 200 : 503);
    }

    if (request.method === "GET" && url.pathname === "/api/share-link") {
      const target = (url.searchParams.get("target") ?? "home").trim().replace(/[^a-zA-Z0-9:_-]/g, "").slice(0, 64) || "home";
      const token = getBotToken(env);
      if (!token) return json({ ok: false, error: "bot_not_configured" }, 503);
      try {
        if(cachedBotUsername && cachedBotUsername.expiresAt>Date.now()) return json({ok:true,url:`https://t.me/${cachedBotUsername.value}?startapp=${encodeURIComponent(target)}`});
        const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
        const payload = await response.json() as { ok?: boolean; result?: { username?: string } };
        const username = payload.result?.username;
        if (!response.ok || !payload.ok || !username) return json({ ok: false, error: "bot_username_unavailable" }, 503);
        cachedBotUsername={value:username,expiresAt:Date.now()+3600000};
        return json({ ok: true, url: `https://t.me/${username}?startapp=${encodeURIComponent(target)}` });
      } catch { return json({ ok: false, error: "share_link_unavailable" }, 503); }
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


    if (request.method === "POST" && url.pathname === "/api/moderation/community") {
      const init=await validateInitData(request.headers.get("x-telegram-init-data")??"",getBotToken(env));
      if(!init||!isAdmin(env,init.user.id))return json({ok:false,error:"forbidden"},403);
      const b=await readJson<Record<string,unknown>>(request); if(!b)return json({ok:false,error:"invalid_json"},400);
      const slug=String(b.slug??"").trim().toLowerCase().replace(/[^a-z0-9_-]/g,"-").slice(0,60);
      const name=String(b.name??"").trim().slice(0,100); const kind=String(b.kind??"topic");
      if(!slug||!name||!["club","hostel","batch","branch","topic","campus"].includes(kind))return json({ok:false,error:"invalid_community"},400);
      await env.DB.prepare("INSERT INTO communities(slug,name,kind,description,rules,owner_telegram_user_id,official,approved) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET name=excluded.name,description=excluded.description,rules=excluded.rules,owner_telegram_user_id=excluded.owner_telegram_user_id,official=excluded.official,approved=excluded.approved").bind(slug,name,kind,String(b.description??"").slice(0,500),String(b.rules??"").slice(0,1000),String(b.owner_telegram_user_id??init.user.id),b.official===true?1:0,b.approved===true?1:0).run();
      return json({ok:true,slug});
    }

    if (request.method === "GET" && url.pathname === "/api/moderation/review") {
      const init=await validateInitData(request.headers.get("x-telegram-init-data")??"",getBotToken(env));
      if(!init||!isAdmin(env,init.user.id))return json({ok:false,error:"forbidden"},403);
      const items=await env.DB.prepare("SELECT id,kind,title,body,telegram_user_id,report_count,created_at FROM community_items WHERE status='review' ORDER BY created_at ASC LIMIT 50").all();
      const replies=await env.DB.prepare("SELECT id,item_id,body,telegram_user_id,report_count,created_at FROM community_replies WHERE status='review' ORDER BY created_at ASC LIMIT 50").all();
      return json({ok:true,items:items.results??[],replies:replies.results??[]});
    }
    if (request.method === "POST" && url.pathname === "/api/moderation/action") {
      const init=await validateInitData(request.headers.get("x-telegram-init-data")??"",getBotToken(env));
      if(!init||!isAdmin(env,init.user.id))return json({ok:false,error:"forbidden"},403);
      const b=await readJson<Record<string,unknown>>(request); if(!b)return json({ok:false,error:"invalid_json"},400);
      const type=String(b.target_type??""); const action=String(b.action??""); const id=Number(b.target_id);
      if(!["item","reply","user"].includes(type)||!["restore","hide","ban"].includes(action)||!Number.isSafeInteger(id)||id<1)return json({ok:false,error:"invalid_action"},400);
      if(type==="item"&&(action==="restore"||action==="hide"))await env.DB.prepare("UPDATE community_items SET status=? WHERE id=?").bind(action==="restore"?"published":"hidden",id).run();
      if(type==="reply"&&(action==="restore"||action==="hide"))await env.DB.prepare("UPDATE community_replies SET status=? WHERE id=?").bind(action==="restore"?"published":"hidden",id).run();
      if(type==="user"&&action==="ban")await env.DB.prepare("INSERT INTO user_bans(telegram_user_id,reason,banned_by) VALUES(?,?,?) ON CONFLICT(telegram_user_id) DO UPDATE SET reason=excluded.reason,banned_by=excluded.banned_by,created_at=CURRENT_TIMESTAMP").bind(String(id),String(b.reason??"moderation"),String(init.user.id)).run();
      await env.DB.prepare("INSERT INTO moderation_actions(admin_telegram_user_id,action,target_type,target_id,reason) VALUES(?,?,?,?,?)").bind(String(init.user.id),action,type,String(id),String(b.reason??"")).run();
      return json({ok:true});
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
        const user = await requireHttpUser(request, env);
        if (!user) return json({ ok: false, error: "unauthorized" }, 401);
        const profiles = await listStudentProfiles(env.DB, 30, user.id, {
          q,
          program,
          branch,
          year,
        });
        return json({ ok: true, trust: "student-reported", profiles });
      } catch { return json({ ok: false, error: "student_profiles_unavailable" }, 500); }
    }

    if (request.method === "POST" && url.pathname === "/api/account/delete") {
      const user = await requireHttpUser(request, env);
      if(!user)return json({ok:false,error:"unauthorized"},401);
      const body=await readJson<{confirm?:unknown}>(request);
      if(body?.confirm!==true)return json({ok:false,error:"confirmation_required"},400);
      await deleteAllStudentData(env.DB,user.id);
      return json({ok:true,deleted:true});
    }

    if (request.method === "POST" && url.pathname === "/api/student-profile/contact") {
      const validated=await validateInitData(request.headers.get("x-telegram-init-data")??"",getBotToken(env));
      if(!validated)return json({ok:false,error:"unauthorized"},401);
      const body=await readJson<{enabled?:unknown}>(request);
      if(!body||typeof body.enabled!=="boolean")return json({ok:false,error:"invalid_contact_preference"},400);
      return json({ok:true,enabled:await setStudentContactEnabled(env.DB,validated.user.id,body.enabled)});
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
      const body = await readJson<{ block_id?: unknown }>(request);
      if (!body) return json({ ok: false, error: "invalid_json" }, 400);
      const blockId=Number(body.block_id);
      if (!Number.isSafeInteger(blockId)||blockId<1) return json({ ok: false, error: "invalid_block" }, 400);
      return json({ ok: true, unblocked: await unblockStudentProfileBlock(env.DB, validated.user.id, blockId) });
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
      const body = await readJson<{ official_updates?: unknown; community_replies?: unknown; community_activity?: unknown; personalized_alerts?: unknown }>(request);
      if (!body) return json({ ok: false, error: "invalid_json" }, 400);
      for (const key of ["official_updates","community_replies","community_activity","personalized_alerts"] as const) {
        if (body[key] !== undefined && typeof body[key] !== "boolean") return json({ ok: false, error: "invalid_preferences" }, 400);
      }
      try {
        const preferences = await setNotificationPreferences(env.DB, validated.user.id, {
          official_updates: body.official_updates as boolean | undefined,
          community_replies: body.community_replies as boolean | undefined,
          community_activity: body.community_activity as boolean | undefined,
          personalized_alerts: body.personalized_alerts as boolean | undefined,
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
        const post = await getStudentPostById(env.DB, postId, validated.user.id);
        return json({ ok: true, post });
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
        const reply = await getStudentReplyById(env.DB, replyId, validated.user.id);
        return json({ ok: true, reply });
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
      let viewerId: number | undefined;
      const homeInitData = request.headers.get("x-telegram-init-data") ?? "";
      if (homeInitData && getBotToken(env)) { const validated = await validateInitData(homeInitData, getBotToken(env)); viewerId = validated?.user.id; }
      let poll = null;
      try {
        poll = await getOpenPoll(env.DB, viewerId);
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

      if (!Number.isSafeInteger(body.poll_id) || !Number.isSafeInteger(body.option_id) || (body.poll_id as number) < 1 || (body.option_id as number) < 1) {
        return json({ ok: false, error: "invalid_vote" }, 400);
      }

      const pollId = body.poll_id as number;
      const optionId = body.option_id as number;

      try {
        await voteInPoll(env.DB, pollId, optionId, validated.user.id);
      } catch (error) {
        if (error instanceof Error && error.message === "poll_closed") return json({ ok: false, error: "poll_closed" }, 400);
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

    if (request.method === "GET" || request.method === "POST" || request.method === "DELETE") {
      const initData = request.headers.get("x-telegram-init-data") ?? "";
      const validated = getBotToken(env) ? await validateInitData(initData, getBotToken(env)) : null;
      if (validated) {
        const banned=await env.DB.prepare("SELECT 1 FROM user_bans WHERE telegram_user_id=? AND (expires_at IS NULL OR expires_at>CURRENT_TIMESTAMP)").bind(String(validated.user.id)).first();
        if(banned)return json({ok:false,error:"user_banned"},403);
        const communityResponse = await handleCommunityV2(request, env, validated.user);
        if (communityResponse) return communityResponse;
        const featureResponse = await handleFeaturesV4(request, env, validated.user);
        if (featureResponse) return featureResponse;
      } else if (url.pathname.startsWith("/api/community-v2")) {
        return json({ ok: false, error: "unauthorized" }, 401);
      }
    }

    return json({ ok: false, error: "not_found" }, 404);
  },
};
