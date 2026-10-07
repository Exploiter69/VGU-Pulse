type CommunityEnv = { DB: D1Database };

type CommunityUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

type CommunityKind =
  | "discussion" | "confession" | "campus" | "exam" | "senior" | "utility"
  | "listing" | "lost_found" | "notes" | "pyq" | "teammate" | "ride"
  | "roommate" | "teacher" | "elective" | "opportunity";

const KINDS = new Set<CommunityKind>([
  "discussion","confession","campus","exam","senior","utility","listing",
  "lost_found","notes","pyq","teammate","ride","roommate","teacher","elective","opportunity",
]);

const LIMITS: Record<string, number> = {
  title: 180,
  body: 4000,
  community: 60,
  reason: 80,
};

function clamp(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
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

async function body<T>(request: Request): Promise<T | null> {
  try {
    const value = await request.json() as T;
    return value && typeof value === "object" ? value : null;
  } catch { return null; }
}

function unsafeText(value: string): boolean {
  const s = value.toLowerCase();
  return [
    /\\b(?:kill|murder)\\s+(?:you|him|her|them)\\b/,
    /\\b(?:suicide|self[- ]?harm)\\b/,
    /\\b(?:otp|password|cvv|card number)\\b.{0,40}\\d{4,}/,
  ].some((pattern) => pattern.test(s));
}

async function rateLimited(db: D1Database, userId: number, table: "community_items" | "community_replies", hours: number, limit: number): Promise<boolean> {
  const row = await db.prepare(
    `SELECT COUNT(*) AS count FROM ${table} WHERE telegram_user_id = ? AND created_at >= datetime('now', ?)`,
  ).bind(String(userId), `-${hours} hours`).first<{ count: number }>();
  return Number(row?.count ?? 0) >= limit;
}

async function profile(db: D1Database, userId: number): Promise<{ program: string; branch: string; year: number } | null> {
  return db.prepare(
    "SELECT program, branch, year FROM student_profiles WHERE telegram_user_id = ? AND status = 'published'",
  ).bind(String(userId)).first<{ program: string; branch: string; year: number }>();
}

async function award(db: D1Database, userId: number, delta: number, reason: string, reference: string): Promise<void> {
  await db.batch([
    db.prepare(
      "INSERT OR IGNORE INTO community_reputation_events (telegram_user_id, delta, reason, reference_key) VALUES (?, ?, ?, ?)",
    ).bind(String(userId), delta, reason, reference),
    db.prepare(
      "INSERT INTO community_reputation (telegram_user_id, points, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(telegram_user_id) DO UPDATE SET points = points + excluded.points, updated_at = CURRENT_TIMESTAMP",
    ).bind(String(userId), delta),
  ]);
}

function badges(points: number): string[] {
  const out: string[] = [];
  if (points >= 10) out.push("Contributor");
  if (points >= 50) out.push("Helpful");
  if (points >= 150) out.push("Campus Guide");
  if (points >= 400) out.push("Pulse Veteran");
  return out;
}

async function refreshBadges(db: D1Database, userId: number, points: number): Promise<void> {
  for (const badge of badges(points)) {
    await db.prepare("INSERT OR IGNORE INTO community_badges (telegram_user_id, badge) VALUES (?, ?)").bind(String(userId), badge).run();
  }
}

async function createItem(db: D1Database, user: CommunityUser, input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const kind = clamp(input.kind, 30) as CommunityKind;
  const title = clamp(input.title, LIMITS.title);
  const text = clamp(input.body, LIMITS.body);
  if (!KINDS.has(kind) || title.length < 4 || text.length < 2) throw new Error("invalid_item");
  if (unsafeText(title + " " + text)) throw new Error("unsafe_content");
  if (await rateLimited(db, user.id, "community_items", 1, 20)) throw new Error("rate_limited");

  const p = await profile(db, user.id);
  const anonymous = kind === "confession" || Boolean(input.anonymous);
  const community = clamp(input.community_slug, LIMITS.community) || "campus";
  const program = clamp(input.audience_program, 80) || p?.program || null;
  const branch = clamp(input.audience_branch, 80) || p?.branch || null;
  const yearValue = Number(input.audience_year ?? p?.year ?? 0);
  const year = Number.isInteger(yearValue) && yearValue >= 1 && yearValue <= 6 ? yearValue : null;

  const result = await db.prepare(
    `INSERT INTO community_items
      (telegram_user_id, kind, title, body, community_slug, audience_program, audience_branch, audience_year, anonymous)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(String(user.id), kind, title, text, community, program, branch, year, anonymous ? 1 : 0).run();

  const id = Number(result.meta.last_row_id);
  await award(db, user.id, 3, "created_item", `item:${id}`);
  await db.prepare(
    `INSERT OR IGNORE INTO student_notifications (telegram_user_id, kind, title, body, reference_key)
     SELECT p.telegram_user_id, 'community', 'New discussion for your community',
       ?, ?
     FROM notification_preferences n
     JOIN student_profiles p ON p.telegram_user_id = n.telegram_user_id AND p.status = 'published'
     WHERE n.personalized_alerts = 1
       AND p.telegram_user_id <> ?
       AND (? IS NULL OR p.program = ?)
       AND (? IS NULL OR p.branch = ?)
       AND (? IS NULL OR p.year = ?)`,
  ).bind(
    `New ${kind.replaceAll("_"," ")}: ${title.slice(0, 140)}`,
    `v2-personal:${id}`,
    String(user.id),
    program, program,
    branch, branch,
    year, year,
  ).run();
  return (await getItem(db, id, user.id))!;
}

async function getItem(db: D1Database, id: number, viewerId?: number): Promise<Record<string, unknown> | null> {
  const row = await db.prepare(
    `SELECT i.id, i.kind, i.title, i.body, i.community_slug, i.audience_program, i.audience_branch,
      i.audience_year, i.anonymous, i.created_at, i.telegram_user_id,
      COALESCE(SUM(CASE WHEN v.vote = 1 THEN 1 ELSE 0 END),0) AS upvotes,
      COALESCE(SUM(CASE WHEN v.vote = -1 THEN 1 ELSE 0 END),0) AS downvotes,
      (SELECT COUNT(*) FROM community_replies r WHERE r.item_id=i.id AND r.status='published') AS replies,
      (SELECT COUNT(*) FROM community_poll_options po WHERE po.item_id=i.id) AS poll_options,
      CASE WHEN EXISTS(SELECT 1 FROM community_follows f WHERE f.item_id=i.id AND f.telegram_user_id=?) THEN 1 ELSE 0 END AS following,
      CASE WHEN EXISTS(SELECT 1 FROM community_saves s WHERE s.item_id=i.id AND s.telegram_user_id=?) THEN 1 ELSE 0 END AS saved,
      CASE WHEN i.telegram_user_id=? THEN 1 ELSE 0 END AS mine
     FROM community_items i
     LEFT JOIN community_votes v ON v.item_id=i.id
     WHERE i.id=? AND i.status='published'
     GROUP BY i.id`,
  ).bind(String(viewerId ?? -1), String(viewerId ?? -1), String(viewerId ?? -1), id).first<Record<string, unknown>>();
  if (!row) return null;
  const ownerId = String(row.telegram_user_id);
  const owner = await db.prepare("SELECT display_name FROM student_profiles WHERE telegram_user_id=?").bind(ownerId).first<{display_name:string}>();
  const display = Number(row.anonymous) ? "Anonymous student" : (owner?.display_name || "VGU student");
  const { telegram_user_id: _private, ...publicRow } = row;
  return { ...publicRow, author: display, trust: "student-community" };
}

async function listItems(db: D1Database, viewerId: number, params: URLSearchParams): Promise<Record<string, unknown>[]> {
  const kind = params.get("kind") as CommunityKind | null;
  const sort = params.get("sort") || "new";
  const community = clamp(params.get("community"), LIMITS.community);
  const search = clamp(params.get("q"), 120);
  const p = await profile(db, viewerId);
  const where = ["i.status='published'"];
  const args: unknown[] = [];
  if (kind && KINDS.has(kind)) { where.push("i.kind=?"); args.push(kind); }
  if (community) { where.push("i.community_slug=?"); args.push(community); }
  if (search) { where.push("(i.title LIKE ? OR i.body LIKE ?)"); args.push(`%${search}%`, `%${search}%`); }
  const audience = params.get("personalized") === "1";
  if (audience && p) {
    where.push("(i.audience_branch IS NULL OR i.audience_branch=? OR i.community_slug='campus')");
    args.push(p.branch);
  }
  const order = sort === "trending"
    ? "(CAST((SELECT COUNT(*) FROM community_votes vv WHERE vv.item_id=i.id AND vv.vote=1) AS REAL) + 2.0*(SELECT COUNT(*) FROM community_replies rr WHERE rr.item_id=i.id AND rr.status='published') + MAX(0.0, 48.0 - (julianday('now')-julianday(i.created_at))*2.0)) DESC"
    : sort === "active"
      ? "(SELECT COUNT(*) FROM community_replies rr WHERE rr.item_id=i.id AND rr.status='published') DESC, i.created_at DESC"
      : "i.created_at DESC";
  const sql = `SELECT i.id,i.kind,i.title,i.body,i.community_slug,i.audience_program,i.audience_branch,i.audience_year,
      i.anonymous,i.created_at,i.telegram_user_id,
      (SELECT COUNT(*) FROM community_votes v WHERE v.item_id=i.id AND v.vote=1) AS upvotes,
      (SELECT COUNT(*) FROM community_votes v WHERE v.item_id=i.id AND v.vote=-1) AS downvotes,
      (SELECT COUNT(*) FROM community_replies r WHERE r.item_id=i.id AND r.status='published') AS replies,
      (SELECT COUNT(*) FROM community_poll_options po WHERE po.item_id=i.id) AS poll_options,
      CASE WHEN EXISTS(SELECT 1 FROM community_votes mv WHERE mv.item_id=i.id AND mv.telegram_user_id=? AND mv.vote=1) THEN 1
           WHEN EXISTS(SELECT 1 FROM community_votes mv WHERE mv.item_id=i.id AND mv.telegram_user_id=? AND mv.vote=-1) THEN -1 ELSE 0 END AS my_vote,
      CASE WHEN EXISTS(SELECT 1 FROM community_follows f WHERE f.item_id=i.id AND f.telegram_user_id=?) THEN 1 ELSE 0 END AS following,
      CASE WHEN EXISTS(SELECT 1 FROM community_saves s WHERE s.item_id=i.id AND s.telegram_user_id=?) THEN 1 ELSE 0 END AS saved
      FROM community_items i WHERE ${where.join(" AND ")} ORDER BY ${order} LIMIT 40`;
  const result = await db.prepare(sql).bind(String(viewerId),String(viewerId),String(viewerId),String(viewerId),...args).all<Record<string, unknown>>();
  const rows = result.results ?? [];
  return Promise.all(rows.map(async row => {
    const owner = await db.prepare("SELECT display_name FROM student_profiles WHERE telegram_user_id=?").bind(String((row as any).telegram_user_id ?? "")).first<{display_name:string}>();
    const author = Number(row.anonymous) ? "Anonymous student" : (owner?.display_name || "VGU student");
    const { telegram_user_id: _private, ...publicRow } = row as Record<string, unknown>;
    return { ...publicRow, author, trust: "student-community" };
  }));
}

async function reply(db: D1Database, user: CommunityUser, itemId: number, text: string, anonymous: boolean): Promise<Record<string, unknown>> {
  const clean = clamp(text, LIMITS.body);
  if (clean.length < 2 || unsafeText(clean)) throw new Error("invalid_reply");
  if (await rateLimited(db, user.id, "community_replies", 1, 60)) throw new Error("rate_limited");
  const item = await db.prepare("SELECT id,telegram_user_id,title FROM community_items WHERE id=? AND status='published'").bind(itemId).first<{id:number;telegram_user_id:string;title:string}>();
  if (!item) throw new Error("item_not_found");
  const result = await db.prepare(
    "INSERT INTO community_replies (item_id,telegram_user_id,body,anonymous) VALUES (?,?,?,?)",
  ).bind(itemId,String(user.id),clean,anonymous ? 1 : 0).run();
  const id = Number(result.meta.last_row_id);
  await award(db,user.id,1,"created_reply",`reply:${id}`);
  if (item.telegram_user_id !== String(user.id)) {
    await db.prepare(
      `INSERT OR IGNORE INTO student_notifications (telegram_user_id,kind,title,body,reference_key)
       SELECT f.telegram_user_id,'community','New activity in a discussion',?,?
       FROM community_follows f JOIN notification_preferences p ON p.telegram_user_id=f.telegram_user_id
       WHERE f.item_id=? AND p.community_activity=1 AND f.telegram_user_id<>?`,
    ).bind(`New reply in “${item.title.slice(0,120)}”.`,`v2-reply:${id}`,itemId,String(user.id)).run();
  }
  return { id, item_id:itemId, body:clean, author:anonymous ? "Anonymous student" : (await db.prepare("SELECT display_name FROM student_profiles WHERE telegram_user_id=?").bind(String(user.id)).first<{display_name:string}>())?.display_name || "VGU student", anonymous };
}

async function vote(db: D1Database,userId:number,itemId:number,value:number): Promise<void> {
  if (value!==1 && value!==-1) throw new Error("invalid_vote");
  const item=await db.prepare("SELECT telegram_user_id FROM community_items WHERE id=? AND status='published'").bind(itemId).first<{telegram_user_id:string}>();
  if(!item) throw new Error("item_not_found");
  const existing=await db.prepare("SELECT vote FROM community_votes WHERE item_id=? AND telegram_user_id=?").bind(itemId,String(userId)).first<{vote:number}>();
  if(existing?.vote===value){
    await db.prepare("DELETE FROM community_votes WHERE item_id=? AND telegram_user_id=?").bind(itemId,String(userId)).run();
    return;
  }
  await db.prepare(
    "INSERT INTO community_votes(item_id,telegram_user_id,vote) VALUES(?,?,?) ON CONFLICT(item_id,telegram_user_id) DO UPDATE SET vote=excluded.vote,created_at=CURRENT_TIMESTAMP",
  ).bind(itemId,String(userId),value).run();
  if(value===1 && item.telegram_user_id!==String(userId)) await award(db,Number(item.telegram_user_id),2,"received_upvote",`upvote:${itemId}:${userId}`);
}

async function poll(db:D1Database,user:CommunityUser,input:Record<string,unknown>):Promise<Record<string,unknown>>{
  const title=clamp(input.title,180), text=clamp(input.body,800);
  const raw=Array.isArray(input.options)?input.options.map(x=>clamp(x,100)).filter(Boolean).slice(0,6):[];
  if(title.length<4||raw.length<2||raw.length>6||unsafeText(title+" "+text)) throw new Error("invalid_poll");
  if(await rateLimited(db,user.id,"community_items",1,20)) throw new Error("rate_limited");
  const item=await createItem(db,user,{...input,kind:"discussion",title,body:text});
  const statements=[db.prepare("DELETE FROM community_poll_options WHERE item_id=?").bind(item.id)];
  for(const label of raw) statements.push(db.prepare("INSERT INTO community_poll_options(item_id,label) VALUES(?,?)").bind(item.id,label));
  await db.batch(statements);
  return item;
}

async function pollVote(db:D1Database,userId:number,itemId:number,optionId:number):Promise<void>{
  const option=await db.prepare("SELECT id FROM community_poll_options WHERE id=? AND item_id=?").bind(optionId,itemId).first();
  if(!option) throw new Error("invalid_option");
  await db.prepare("INSERT INTO community_poll_votes(item_id,option_id,telegram_user_id) VALUES(?,?,?) ON CONFLICT(item_id,telegram_user_id) DO UPDATE SET option_id=excluded.option_id,created_at=CURRENT_TIMESTAMP").bind(itemId,optionId,String(userId)).run();
}

async function reputation(db:D1Database,userId:number){
  const row=await db.prepare("SELECT points FROM community_reputation WHERE telegram_user_id=?").bind(String(userId)).first<{points:number}>();
  const points=Number(row?.points??0);
  await refreshBadges(db,userId,points);
  const b=await db.prepare("SELECT badge FROM community_badges WHERE telegram_user_id=? ORDER BY created_at").bind(String(userId)).all<{badge:string}>();
  return {points,badges:(b.results??[]).map(x=>x.badge)};
}

export async function handleCommunityV2(request:Request,env:CommunityEnv,user:CommunityUser):Promise<Response|null>{
  const url=new URL(request.url);
  if(!url.pathname.startsWith("/api/community-v2")) return null;

  try{
    if(request.method==="GET" && url.pathname==="/api/community-v2/context"){
      const p=await profile(env.DB,user.id);
      const community=p ? p.branch.toLowerCase().replace(/[^a-z0-9]+/g,"-") + "-year-" + p.year : "campus";
      return json({ok:true,profile:p,community});
    }
    if(request.method==="GET" && url.pathname==="/api/community-v2/feed"){
      return json({ok:true,items:await listItems(env.DB,user.id,url.searchParams)});
    }
    if(request.method==="GET" && url.pathname==="/api/community-v2/reputation"){
      return json({ok:true,reputation:await reputation(env.DB,user.id)});
    }
    if(request.method==="GET" && url.pathname==="/api/community-v2/replies"){
      const id=Number(url.searchParams.get("item_id"));
      if(!Number.isSafeInteger(id)||id<1)return json({ok:false,error:"invalid_item"},400);
      const rows=await env.DB.prepare(`SELECT r.id,r.body,r.anonymous,r.created_at,
        CASE WHEN r.anonymous=1 THEN 'Anonymous student' ELSE COALESCE(sp.display_name,'VGU student') END author
        FROM community_replies r LEFT JOIN student_profiles sp ON sp.telegram_user_id=r.telegram_user_id
        WHERE r.item_id=? AND r.status='published' ORDER BY r.created_at ASC LIMIT 100`).bind(id).all();
      return json({ok:true,replies:rows.results??[]});
    }
    if(request.method==="GET" && url.pathname==="/api/community-v2/poll"){
      const id=Number(url.searchParams.get("item_id"));
      const options=await env.DB.prepare(`SELECT o.id,o.label,COUNT(v.telegram_user_id) votes
        FROM community_poll_options o LEFT JOIN community_poll_votes v ON v.option_id=o.id
        WHERE o.item_id=? GROUP BY o.id ORDER BY o.id`).bind(id).all();
      return json({ok:true,options:options.results??[]});
    }
    if(request.method==="GET" && url.pathname==="/api/community-v2/communities"){
      const rows=await env.DB.prepare(`SELECT community_slug,COUNT(*) posts FROM community_items
        WHERE status='published' GROUP BY community_slug ORDER BY posts DESC LIMIT 30`).all();
      return json({ok:true,communities:rows.results??[]});
    }
    if(request.method==="GET" && url.pathname==="/api/community-v2/search"){
      const q=clamp(url.searchParams.get("q"),120);
      return json({ok:true,items:await listItems(env.DB,user.id,new URLSearchParams({q,sort:"trending"}))});
    }

    if(request.method==="POST" && url.pathname==="/api/community-v2/items"){
      const input=await body<Record<string,unknown>>(request); if(!input)return json({ok:false,error:"invalid_json"},400);
      const item=await createItem(env.DB,user,input);
      return json({ok:true,item},201);
    }
    if(request.method==="POST" && url.pathname==="/api/community-v2/polls"){
      const input=await body<Record<string,unknown>>(request); if(!input)return json({ok:false,error:"invalid_json"},400);
      const item=await poll(env.DB,user,input);
      return json({ok:true,item},201);
    }
    if(request.method==="POST" && url.pathname==="/api/community-v2/replies"){
      const input=await body<Record<string,unknown>>(request); if(!input)return json({ok:false,error:"invalid_json"},400);
      const id=Number(input.item_id); const r=await reply(env.DB,user,id,clamp(input.body,LIMITS.body),Boolean(input.anonymous));
      return json({ok:true,reply:r},201);
    }
    if(request.method==="POST" && url.pathname==="/api/community-v2/vote"){
      const input=await body<Record<string,unknown>>(request); if(!input)return json({ok:false,error:"invalid_json"},400);
      await vote(env.DB,user.id,Number(input.item_id),Number(input.vote)); return json({ok:true});
    }
    if(request.method==="POST" && url.pathname==="/api/community-v2/poll-vote"){
      const input=await body<Record<string,unknown>>(request); if(!input)return json({ok:false,error:"invalid_json"},400);
      await pollVote(env.DB,user.id,Number(input.item_id),Number(input.option_id)); return json({ok:true});
    }
    if(request.method==="POST" && url.pathname==="/api/community-v2/follow"){
      const input=await body<Record<string,unknown>>(request); if(!input)return json({ok:false,error:"invalid_json"},400);
      const id=Number(input.item_id);
      await env.DB.prepare("INSERT OR IGNORE INTO community_follows(item_id,telegram_user_id) VALUES(?,?)").bind(id,String(user.id)).run();
      return json({ok:true,following:true});
    }
    if(request.method==="DELETE" && url.pathname==="/api/community-v2/follow"){
      const id=Number(url.searchParams.get("item_id"));
      await env.DB.prepare("DELETE FROM community_follows WHERE item_id=? AND telegram_user_id=?").bind(id,String(user.id)).run();
      return json({ok:true,following:false});
    }
    if(request.method==="POST" && url.pathname==="/api/community-v2/save"){
      const input=await body<Record<string,unknown>>(request); if(!input)return json({ok:false,error:"invalid_json"},400);
      await env.DB.prepare("INSERT OR IGNORE INTO community_saves(item_id,telegram_user_id) VALUES(?,?)").bind(Number(input.item_id),String(user.id)).run();
      return json({ok:true,saved:true});
    }
    if(request.method==="DELETE" && url.pathname==="/api/community-v2/save"){
      const id=Number(url.searchParams.get("item_id"));
      await env.DB.prepare("DELETE FROM community_saves WHERE item_id=? AND telegram_user_id=?").bind(id,String(user.id)).run();
      return json({ok:true,saved:false});
    }
    if(request.method==="POST" && url.pathname==="/api/community-v2/report"){
      const input=await body<Record<string,unknown>>(request); if(!input)return json({ok:false,error:"invalid_json"},400);
      const id=Number(input.item_id); const reason=clamp(input.reason,LIMITS.reason)||"other";
      const result=await env.DB.prepare("INSERT OR IGNORE INTO community_reports(item_id,telegram_user_id,reason) VALUES(?,?,?)").bind(id,String(user.id),reason).run();
      if(Number(result.meta.changes??0)) await env.DB.prepare(
        "UPDATE community_items SET report_count=report_count+1,status=CASE WHEN report_count+1>=3 THEN 'hidden' ELSE status END WHERE id=?",
      ).bind(id).run();
      return json({ok:true});
    }
    if(request.method==="POST" && url.pathname==="/api/community-v2/report-reply"){
      const input=await body<Record<string,unknown>>(request); if(!input)return json({ok:false,error:"invalid_json"},400);
      const id=Number(input.reply_id); if(!Number.isSafeInteger(id)||id<1)return json({ok:false,error:"invalid_reply"},400);
      const result=await env.DB.prepare("UPDATE community_replies SET report_count=report_count+1,status=CASE WHEN report_count+1>=3 THEN 'hidden' ELSE status END WHERE id=? AND status='published'").bind(id).run();
      if(!Number(result.meta.changes??0)) return json({ok:false,error:"reply_not_found"},404);
      return json({ok:true});
    }
    if(request.method==="POST" && url.pathname==="/api/community-v2/block"){
      const input=await body<Record<string,unknown>>(request); if(!input)return json({ok:false,error:"invalid_json"},400);
      const id=Number(input.item_id); if(!Number.isSafeInteger(id)||id<1)return json({ok:false,error:"invalid_item"},400);
      const owner=await env.DB.prepare("SELECT telegram_user_id FROM community_items WHERE id=?").bind(id).first<{telegram_user_id:string}>();
      if(!owner || owner.telegram_user_id===String(user.id)) return json({ok:false,error:"invalid_target"},400);
      await env.DB.prepare("INSERT OR IGNORE INTO student_profile_blocks(blocker_telegram_user_id,blocked_telegram_user_id) VALUES(?,?)").bind(String(user.id),owner.telegram_user_id).run();
      return json({ok:true});
    }
    if(request.method==="GET" && url.pathname==="/api/community-v2/preferences"){
      const row=await env.DB.prepare("SELECT community_activity,personalized_alerts FROM notification_preferences WHERE telegram_user_id=?").bind(String(user.id)).first<{community_activity:number;personalized_alerts:number}>();
      return json({ok:true,preferences:{community_activity:Boolean(row?.community_activity),personalized_alerts:Boolean(row?.personalized_alerts)}});
    }
    if(request.method==="POST" && url.pathname==="/api/community-v2/preferences"){
      const input=await body<Record<string,unknown>>(request); if(!input)return json({ok:false,error:"invalid_json"},400);
      await env.DB.prepare("INSERT OR IGNORE INTO notification_preferences(telegram_user_id) VALUES(?)").bind(String(user.id)).run();
      const a=Boolean(input.community_activity),b=Boolean(input.personalized_alerts);
      await env.DB.prepare("UPDATE notification_preferences SET community_activity=?,personalized_alerts=?,updated_at=CURRENT_TIMESTAMP WHERE telegram_user_id=?").bind(a?1:0,b?1:0,String(user.id)).run();
      return json({ok:true,preferences:{community_activity:a,personalized_alerts:b}});
    }
    return json({ok:false,error:"not_found"},404);
  }catch(error){
    const message=error instanceof Error?error.message:"unknown";
    const status=message==="rate_limited"?429:message==="unsafe_content"?422:message==="invalid_item"||message==="invalid_reply"||message==="invalid_vote"||message==="invalid_poll"||message==="invalid_option"?400:500;
    return json({ok:false,error:message},status);
  }
}
