import { SUPPORT_RESOURCES } from "./support";
import { clamp, json, readJson as body, safePositiveId } from "./http";
type CommunityEnv = { DB: D1Database; ANON_ALIAS_SECRET?: string; ADMIN_IDS?: string };

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

const DAILY_REPUTATION_CAP = 25;

function communitySlug(value: unknown): string { return typeof value === "string" ? value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,60) : ""; }

const LIMITS: Record<string, number> = {
  title: 180,
  body: 4000,
  community: 60,
  reason: 80,
};

function unsafeText(value: string): { threat: boolean; credential: boolean; support: boolean } {
  const s = value.toLowerCase();
  return {
    threat: /\b(?:kill|murder)\s+(?:you|him|her|them)\b/.test(s),
    credential: /\b(?:otp|one[- ]time password|password|cvv|card number|login credentials|verification code)\b/.test(s),
    support: /\b(?:suicide|self[- ]?harm|kill myself|end my life)\b/.test(s),
  };
}

function requireSafeContent(value: string): { support: boolean } {
  const result = unsafeText(value);
  if (result.threat || result.credential) throw new Error("unsafe_content");
  return { support: result.support };
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
  if (delta > 0) {
    const row = await db.prepare("SELECT COALESCE(SUM(delta),0) points FROM community_reputation_events WHERE telegram_user_id=? AND delta>0 AND created_at>=date('now')")
      .bind(String(userId)).first<{ points:number }>();
    const remaining = Math.max(0, DAILY_REPUTATION_CAP - Number(row?.points ?? 0));
    if (remaining <= 0) return;
    delta = Math.min(delta, remaining);
  }
  const existing = await db.prepare("SELECT delta FROM community_reputation_events WHERE telegram_user_id=? AND reference_key=?").bind(String(userId),reference).first<{delta:number}>();
  if (existing) {
    if (existing.delta === 0 && delta > 0) {
      await db.batch([
        db.prepare("UPDATE community_reputation_events SET delta=?,reason=?,created_at=CURRENT_TIMESTAMP WHERE telegram_user_id=? AND reference_key=?").bind(delta,reason,String(userId),reference),
        db.prepare("INSERT INTO community_reputation (telegram_user_id,points,updated_at) VALUES (?,?,CURRENT_TIMESTAMP) ON CONFLICT(telegram_user_id) DO UPDATE SET points=points+excluded.points,updated_at=CURRENT_TIMESTAMP").bind(String(userId),delta),
      ]);
    }
    return;
  }
  await db.batch([
    db.prepare(
      "INSERT INTO community_reputation_events (telegram_user_id, delta, reason, reference_key) VALUES (?, ?, ?, ?)",
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

async function createItem(db: D1Database, user: CommunityUser, input: Record<string, unknown>, anonAliasSecret?:string): Promise<Record<string, unknown>> {
  const kind = clamp(input.kind, 30) as CommunityKind;
  const title = clamp(input.title, LIMITS.title);
  const text = clamp(input.body, LIMITS.body);
  if (!KINDS.has(kind) || title.length < 4 || text.length < 2) throw new Error("invalid_item");
  const support = requireSafeContent(title + " " + text);
  if (await rateLimited(db, user.id, "community_items", 1, 20)) throw new Error("rate_limited");

  const p = await profile(db, user.id);
  const rulesAck=await db.prepare("SELECT 1 FROM community_rules_ack WHERE telegram_user_id=?").bind(String(user.id)).first();
  if(!rulesAck)throw new Error("rules_required");
  const anonymous = kind === "confession" || Boolean(input.anonymous);
  if(anonymous){
    const notice=await db.prepare("SELECT 1 FROM community_anonymous_notices WHERE telegram_user_id=?").bind(String(user.id)).first();
    if(!notice)throw new Error("anonymous_notice_required");
  }
  const community = communitySlug(input.community_slug) || "campus";
  const communityRow=await db.prepare("SELECT slug FROM communities WHERE slug=? AND approved=1").bind(community).first<{slug:string}>();
  if(!communityRow) throw new Error("invalid_community");
  const program = anonymous ? null : (clamp(input.audience_program, 80) || p?.program || null);
  const branch = anonymous ? null : (clamp(input.audience_branch, 80) || p?.branch || null);
  const yearValue = anonymous ? 0 : Number(input.audience_year ?? p?.year ?? 0);
  const year = Number.isInteger(yearValue) && yearValue >= 1 && yearValue <= 6 ? yearValue : null;

  const result = await db.prepare(
    `INSERT INTO community_items
      (telegram_user_id, kind, title, body, community_slug, audience_program, audience_branch, audience_year, anonymous)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(String(user.id), kind, title, text, community, program, branch, year, anonymous ? 1 : 0).run();

  const id = Number(result.meta.last_row_id);
  await db.prepare("INSERT OR IGNORE INTO community_follows(item_id,telegram_user_id) VALUES(?,?)").bind(id,String(user.id)).run();
  await award(db, user.id, 3, "created_item", `item:${id}`);
  try { await db.prepare(
    `INSERT OR IGNORE INTO student_notifications (telegram_user_id, kind, channel, title, body, reference_key)
     SELECT p.telegram_user_id, 'community', 'personalized', 'New discussion for your community',
       ?, ?
     FROM notification_preferences n
     JOIN student_profiles p ON p.telegram_user_id = n.telegram_user_id AND p.status = 'published'
     WHERE n.personalized_alerts = 1
       AND p.telegram_user_id <> ?
       AND NOT EXISTS (SELECT 1 FROM student_profile_blocks b WHERE b.blocker_telegram_user_id=p.telegram_user_id AND b.blocked_telegram_user_id=?)
       AND (SELECT COUNT(*) FROM student_notifications sn WHERE sn.telegram_user_id=p.telegram_user_id AND sn.channel='personalized' AND sn.created_at>=date('now')) < 3
       AND (? IS NULL OR p.program = ?)
       AND (? IS NULL OR p.branch = ?)
       AND (? IS NULL OR p.year = ?)`,
  ).bind(
    `New ${kind.replaceAll("_"," ")}: ${title.slice(0, 140)}`,
    `v2-personal:${id}`,
    String(user.id),
    String(user.id),
    program, program,
    branch, branch,
    year, year,
  ).run(); } catch (error) { console.error(JSON.stringify({event:"community_v2_stage",stage:"personalized_notification_query",error:error instanceof Error?error.message:"unknown"})); throw error; }
  try { return { ...(await getItem(db, id, user.id))!, support: support.support, support_resources: support.support ? SUPPORT_RESOURCES.india : [] }; } catch (error) { console.error(JSON.stringify({event:"community_v2_stage",stage:"get_item_after_create",error:error instanceof Error?error.message:"unknown"})); throw error; }
}

async function updateItem(db: D1Database, user: CommunityUser, id: number, input: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("invalid_item");
  const title = clamp(input.title, LIMITS.title);
  const text = clamp(input.body, LIMITS.body);
  if (title.length < 4 || text.length < 2) throw new Error("invalid_item");
  requireSafeContent(title + " " + text);
  const item = await db.prepare("SELECT telegram_user_id,kind FROM community_items WHERE id=? AND status='published'").bind(id).first<{telegram_user_id:string;kind:string}>();
  if (!item) throw new Error("item_not_found");
  if (item.telegram_user_id !== String(user.id)) throw new Error("forbidden");
  await db.prepare("UPDATE community_items SET title=?,body=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND telegram_user_id=?").bind(title,text,id,String(user.id)).run();
  return (await getItem(db,id,user.id))!;
}


async function anonymousAlias(secret:string|undefined,userId:number,itemId:number):Promise<string>{
  const key=secret||"vgu-pulse-anonymous-alias-fallback";
  const cryptoKey=await crypto.subtle.importKey("raw",new TextEncoder().encode(key),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const digest=await crypto.subtle.sign("HMAC",cryptoKey,new TextEncoder().encode(userId+":"+itemId));
  const bytes=new Uint8Array(digest); let n=0; for(let i=0;i<4;i++) n=(n*256)+bytes[i];
  return "Anon-"+((n%9999)+1);
}
function adminIds(raw?:string):Set<string>{return new Set((raw??"").split(",").map(x=>x.trim()).filter(Boolean));}

async function getItem(db: D1Database, id: number, viewerId?: number, anonSecret?:string): Promise<Record<string, unknown> | null> {
  const row = await db.prepare(
    `SELECT i.id, i.kind, i.title, i.body, i.community_slug, i.audience_program, i.audience_branch,
      i.audience_year, i.anonymous, i.created_at, i.telegram_user_id, i.solved, i.accepted_reply_id,
      COALESCE(SUM(CASE WHEN v.vote = 1 THEN 1 ELSE 0 END),0) AS upvotes,
      COALESCE(SUM(CASE WHEN v.vote = -1 THEN 1 ELSE 0 END),0) AS downvotes,
      (SELECT COUNT(*) FROM community_replies r WHERE r.item_id=i.id AND r.status='published') AS replies,
      (SELECT COUNT(*) FROM community_poll_options po WHERE po.item_id=i.id) AS poll_options,
      CASE WHEN EXISTS(SELECT 1 FROM community_follows f WHERE f.item_id=i.id AND f.telegram_user_id=?) THEN 1 ELSE 0 END AS following,
      CASE WHEN EXISTS(SELECT 1 FROM community_saves s WHERE s.item_id=i.id AND s.telegram_user_id=?) THEN 1 ELSE 0 END AS saved,
      CASE WHEN EXISTS(SELECT 1 FROM community_item_reads rd WHERE rd.item_id=i.id AND rd.telegram_user_id=? AND rd.last_read_at >= i.created_at) THEN 0 ELSE 1 END AS unread,
      CASE WHEN i.telegram_user_id=? THEN 1 ELSE 0 END AS mine,
      CASE WHEN EXISTS(SELECT 1 FROM community_votes mv WHERE mv.item_id=i.id AND mv.telegram_user_id=? AND mv.vote=1) THEN 1
           WHEN EXISTS(SELECT 1 FROM community_votes mv WHERE mv.item_id=i.id AND mv.telegram_user_id=? AND mv.vote=-1) THEN -1 ELSE 0 END AS my_vote
     FROM community_items i
     LEFT JOIN community_votes v ON v.item_id=i.id
     WHERE i.id=? AND i.status='published'
     GROUP BY i.id`,
  ).bind(String(viewerId ?? -1), String(viewerId ?? -1), String(viewerId ?? -1), String(viewerId ?? -1), String(viewerId ?? -1), id).first<Record<string, unknown>>();
  if (!row) return null;
  const ownerId = String(row.telegram_user_id);
  const owner = await db.prepare("SELECT display_name FROM student_profiles WHERE telegram_user_id=?").bind(ownerId).first<{display_name:string}>();
  const display = Number(row.anonymous) ? await anonymousAlias(anonSecret,Number(ownerId),id) : (owner?.display_name || "VGU student");
  const { telegram_user_id: _private, ...publicRow } = row;
  if(Number(row.anonymous)){ publicRow.audience_program=null; publicRow.audience_branch=null; publicRow.audience_year=null; }
  return { ...publicRow, author: display, trust: "student-community" };
}

async function listItems(db: D1Database, viewerId: number, params: URLSearchParams, anonSecret?:string): Promise<Record<string, unknown>[]> {
  const kind = params.get("kind") as CommunityKind | null;
  const sort = params.get("sort") || "new";
  const community = clamp(params.get("community"), LIMITS.community);
  const search = clamp(params.get("q"), 120);
  const limitValue = Number(params.get("limit") || 40);
  const limit = Number.isInteger(limitValue) && limitValue >= 1 && limitValue <= 40 ? limitValue : 40;
  const cursorRaw=params.get("cursor");
  let cursor:{created_at:string;id:number}|null=null;
  if(cursorRaw){try{const decoded=JSON.parse(atob(cursorRaw)); if(typeof decoded.created_at==="string"&&Number.isSafeInteger(decoded.id)&&decoded.id>0)cursor=decoded;}catch{throw new Error("invalid_cursor");}}
  const p = await profile(db, viewerId);
  const where = ["i.status='published'"];
  const solvedFilter=params.get("solved");
  if(solvedFilter==="solved")where.push("i.solved=1");
  if(solvedFilter==="unanswered")where.push("i.solved=0");
  const args: unknown[] = [];
  if (kind && KINDS.has(kind)) { where.push("i.kind=?"); args.push(kind); }
  if (community) { where.push("i.community_slug=?"); args.push(community); }
  if (search) { where.push("i.id IN (SELECT rowid FROM community_items_fts WHERE community_items_fts MATCH ?)"); args.push(search.replace(/[^a-zA-Z0-9 ]/g," ").trim()+"*"); }
  if (params.get("saved") === "1") {
    where.push("EXISTS (SELECT 1 FROM community_saves sx WHERE sx.item_id=i.id AND sx.telegram_user_id=?)");
    args.push(String(viewerId));
  }
  const audience = params.get("personalized") === "1";
  if (sort==="new" && cursor) { where.push("(i.created_at < ? OR (i.created_at = ? AND i.id < ?))"); args.push(cursor.created_at,cursor.created_at,cursor.id); }
  if (audience && p) {
    where.push("(i.audience_branch IS NULL OR i.audience_branch=? OR i.community_slug='campus')");
    args.push(p.branch);
  }
  const order = sort === "trending"
    ? "((CAST((SELECT COUNT(*) FROM community_votes vv WHERE vv.item_id=i.id AND vv.vote=1) AS REAL) - CAST((SELECT COUNT(*) FROM community_votes vv WHERE vv.item_id=i.id AND vv.vote=-1) AS REAL) + 2.0*(SELECT COUNT(*) FROM community_replies rr WHERE rr.item_id=i.id AND rr.status='published') + 1.0) / pow((MAX(0.0,(julianday('now')-julianday(i.created_at))*24.0) + 2.0),1.5)) DESC"
    : sort === "active"
      ? "(SELECT COUNT(*) FROM community_replies rr WHERE rr.item_id=i.id AND rr.status='published') DESC, i.created_at DESC"
      : "i.created_at DESC";
  const sql = `SELECT i.id,i.kind,i.title,i.body,i.community_slug,i.audience_program,i.audience_branch,i.audience_year,
      i.anonymous,i.created_at,i.updated_at,i.telegram_user_id,sp.display_name,i.solved,i.accepted_reply_id,
      CASE WHEN i.telegram_user_id=? THEN 1 ELSE 0 END AS mine,
      (SELECT COUNT(*) FROM community_votes v WHERE v.item_id=i.id AND v.vote=1) AS upvotes,
      (SELECT COUNT(*) FROM community_votes v WHERE v.item_id=i.id AND v.vote=-1) AS downvotes,
      (SELECT COUNT(*) FROM community_replies r WHERE r.item_id=i.id AND r.status='published') AS replies,
      (SELECT COUNT(*) FROM community_poll_options po WHERE po.item_id=i.id) AS poll_options,
      CASE WHEN EXISTS(SELECT 1 FROM community_votes mv WHERE mv.item_id=i.id AND mv.telegram_user_id=? AND mv.vote=1) THEN 1
           WHEN EXISTS(SELECT 1 FROM community_votes mv WHERE mv.item_id=i.id AND mv.telegram_user_id=? AND mv.vote=-1) THEN -1 ELSE 0 END AS my_vote,
      CASE WHEN EXISTS(SELECT 1 FROM community_follows f WHERE f.item_id=i.id AND f.telegram_user_id=?) THEN 1 ELSE 0 END AS following,
      CASE WHEN EXISTS(SELECT 1 FROM community_saves s WHERE s.item_id=i.id AND s.telegram_user_id=?) THEN 1 ELSE 0 END AS saved
      FROM community_items i LEFT JOIN student_profiles sp ON sp.telegram_user_id=i.telegram_user_id WHERE ${where.join(" AND ")}
        AND NOT EXISTS (SELECT 1 FROM student_profile_blocks b WHERE b.blocker_telegram_user_id=? AND b.blocked_telegram_user_id=i.telegram_user_id)
      ORDER BY ${order} LIMIT ?`;
  const result = await db.prepare(sql).bind(String(viewerId),String(viewerId),String(viewerId),String(viewerId),String(viewerId),String(viewerId),...args,String(viewerId),limit+1).all<Record<string, unknown>>();
  const rows = (result.results ?? []).slice(0,limit);
  return Promise.all(rows.map(async row => {
    const author = Number(row.anonymous) ? await anonymousAlias(anonSecret,Number(row.telegram_user_id),Number(row.id)) : ((row as any).display_name || "VGU student");
    const { telegram_user_id: _private, display_name: _name, ...publicRow } = row as Record<string, unknown>;
    if(Number(row.anonymous)){ publicRow.audience_program=null; publicRow.audience_branch=null; publicRow.audience_year=null; }
    return { ...publicRow, mine: Boolean(row.mine), author, trust: "student-community" };
  }));
}

async function reply(db: D1Database, user: CommunityUser, itemId: number, text: string, anonymous: boolean, anonAliasSecret?:string): Promise<Record<string, unknown>> {
  const clean = clamp(text, LIMITS.body);
  if (clean.length < 2) throw new Error("invalid_reply");
  const support = requireSafeContent(clean);
  if (await rateLimited(db, user.id, "community_replies", 1, 60)) throw new Error("rate_limited");
  const item = await db.prepare("SELECT id,telegram_user_id,title FROM community_items WHERE id=? AND status='published'").bind(itemId).first<{id:number;telegram_user_id:string;title:string}>();
  if (!item) throw new Error("item_not_found");
  const result = await db.prepare(
    "INSERT INTO community_replies (item_id,telegram_user_id,body,anonymous) VALUES (?,?,?,?)",
  ).bind(itemId,String(user.id),clean,anonymous ? 1 : 0).run();
  const id = Number(result.meta.last_row_id);
  await award(db,user.id,1,"created_reply",`reply:${id}`);
  await db.prepare("INSERT OR IGNORE INTO community_follows(item_id,telegram_user_id) VALUES(?,?)").bind(itemId,String(user.id)).run();
  await db.prepare(
    `INSERT OR IGNORE INTO student_notifications (telegram_user_id,kind,channel,title,body,reference_key)
     SELECT f.telegram_user_id,'community','community_activity','New activity in a discussion',?,?
     FROM community_follows f JOIN notification_preferences p ON p.telegram_user_id=f.telegram_user_id
     WHERE f.item_id=? AND p.community_activity=1 AND f.telegram_user_id<>?`,
  ).bind(`New reply in “${item.title.slice(0,120)}”.`,`v2-reply:${id}`,itemId,String(user.id)).run();
  if (item.telegram_user_id !== String(user.id)) {
    await db.prepare(
      `INSERT OR IGNORE INTO student_notifications (telegram_user_id,kind,channel,title,body,reference_key)
       SELECT telegram_user_id,'community','community_replies','New reply to your discussion',?,?
       FROM notification_preferences WHERE telegram_user_id=? AND community_replies=1`,
    ).bind(`Someone replied to “${item.title.slice(0,120)}”: ${clean.slice(0,500)}`,`v2-author-reply:${id}`,item.telegram_user_id).run();
  }
  return { id, item_id:itemId, body:clean, support:support.support, support_resources:support.support ? SUPPORT_RESOURCES.india : [], author:anonymous ? "Anonymous student" : (await db.prepare("SELECT display_name FROM student_profiles WHERE telegram_user_id=?").bind(String(user.id)).first<{display_name:string}>())?.display_name || "VGU student", anonymous };
}

async function vote(db: D1Database,userId:number,itemId:number,value:number): Promise<void> {
  if (value!==1 && value!==-1) throw new Error("invalid_vote");
  const item=await db.prepare("SELECT telegram_user_id,anonymous FROM community_items WHERE id=? AND status='published'").bind(itemId).first<{telegram_user_id:string;anonymous:number}>();
  if(!item) throw new Error("item_not_found");
  const existing=await db.prepare("SELECT vote FROM community_votes WHERE item_id=? AND telegram_user_id=?").bind(itemId,String(userId)).first<{vote:number}>();
  if(existing?.vote===value){
    await db.prepare("DELETE FROM community_votes WHERE item_id=? AND telegram_user_id=?").bind(itemId,String(userId)).run();
    if(existing.vote===1 && item.telegram_user_id!==String(userId)){
      const ref=`upvote:${itemId}:${userId}`;
      const voided=await db.prepare("UPDATE community_reputation_events SET delta=0,reason='received_upvote_voided' WHERE telegram_user_id=? AND reference_key=? AND delta>0").bind(item.telegram_user_id,ref).run();
      if(Number(voided.meta.changes??0)) await db.prepare("UPDATE community_reputation SET points=points-2,updated_at=CURRENT_TIMESTAMP WHERE telegram_user_id=?").bind(item.telegram_user_id).run();
    }
    return;
  }
  await db.prepare(
    "INSERT INTO community_votes(item_id,telegram_user_id,vote) VALUES(?,?,?) ON CONFLICT(item_id,telegram_user_id) DO UPDATE SET vote=excluded.vote,created_at=CURRENT_TIMESTAMP",
  ).bind(itemId,String(userId),value).run();
  if(item.telegram_user_id!==String(userId)){
    const ref=`upvote:${itemId}:${userId}`;
    if(value===1) await award(db,Number(item.telegram_user_id),2,"received_upvote",ref);
    else if(existing?.vote===1){
      const voided=await db.prepare("UPDATE community_reputation_events SET delta=0,reason='received_upvote_voided' WHERE telegram_user_id=? AND reference_key=? AND delta>0").bind(item.telegram_user_id,ref).run();
      if(Number(voided.meta.changes??0)) await db.prepare("UPDATE community_reputation SET points=points-2,updated_at=CURRENT_TIMESTAMP WHERE telegram_user_id=?").bind(item.telegram_user_id).run();
    }
  }
}

async function poll(db:D1Database,user:CommunityUser,input:Record<string,unknown>,anonAliasSecret?:string):Promise<Record<string,unknown>>{
  const title=clamp(input.title,180), text=clamp(input.body,800);
  const raw=Array.isArray(input.options)?input.options.map(x=>clamp(x,100)).filter(Boolean).slice(0,6):[];
  if(title.length<4||raw.length<2||raw.length>6) throw new Error("invalid_poll");
  requireSafeContent(title+" "+text);
  if(await rateLimited(db,user.id,"community_items",1,20)) throw new Error("rate_limited");
  const item=await createItem(db,user,{...input,kind:"discussion",title,body:text},anonAliasSecret);
  const statements=[db.prepare("DELETE FROM community_poll_options WHERE item_id=?").bind(item.id)];
  for(const label of raw) statements.push(db.prepare("INSERT INTO community_poll_options(item_id,label) VALUES(?,?)").bind(item.id,label));
  await db.batch(statements);
  return item;
}

async function pollVote(db:D1Database,userId:number,itemId:number,optionId:number):Promise<void>{
  const poll=await db.prepare("SELECT id,poll_status,poll_closes_at FROM community_items WHERE id=? AND status='published'").bind(itemId).first<{id:number;poll_status:"open"|"closed";poll_closes_at:string|null}>();
  if(!poll) throw new Error("item_not_found");
  if(poll.poll_status!=="open" || (poll.poll_closes_at && Date.parse(poll.poll_closes_at)<=Date.now())) throw new Error("poll_closed");
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
    if(request.method==="GET" && url.pathname==="/api/community-v2/rules"){
      return json({ok:true,rules:["Be respectful and do not impersonate VGU officials.","Do not share passwords, OTPs, private credentials or personal data.","Report harmful or misleading content instead of brigading it.","Anonymous posts are tied to your account on our server for moderation."]});
    }
    if(request.method==="GET" && url.pathname==="/api/community-v2/anonymous-notice"){
      const row=await env.DB.prepare("SELECT 1 FROM community_anonymous_notices WHERE telegram_user_id=?").bind(String(user.id)).first();
      return json({ok:true,acknowledged:Boolean(row),notice:"Anonymous to students, still tied to your account on our server; admins may review reports."});
    }
    if(request.method==="POST" && url.pathname==="/api/community-v2/anonymous-notice"){
      await env.DB.prepare("INSERT OR IGNORE INTO community_anonymous_notices(telegram_user_id) VALUES(?)").bind(String(user.id)).run();
      return json({ok:true,acknowledged:true});
    }
    if(request.method==="POST" && url.pathname==="/api/community-v2/rules/ack"){
      await env.DB.prepare("INSERT OR IGNORE INTO community_rules_ack(telegram_user_id) VALUES(?)").bind(String(user.id)).run();
      return json({ok:true,acknowledged:true});
    }
    if(request.method==="GET" && url.pathname==="/api/community-v2/rules/ack"){
      const row=await env.DB.prepare("SELECT 1 FROM community_rules_ack WHERE telegram_user_id=?").bind(String(user.id)).first();
      return json({ok:true,acknowledged:Boolean(row)});
    }
    if(request.method==="POST" && url.pathname==="/api/community-v2/reply-vote"){
      const input=await body<Record<string,unknown>>(request); if(!input)return json({ok:false,error:"invalid_json"},400);
      const replyId=Number(input.reply_id), value=Number(input.vote);
      if(!Number.isSafeInteger(replyId)||replyId<1)return json({ok:false,error:"invalid_reply"},400);
      if(value!==1&&value!==-1)return json({ok:false,error:"invalid_vote"},400);
      const replyRow=await env.DB.prepare("SELECT id,telegram_user_id FROM community_replies WHERE id=? AND status='published'").bind(replyId).first<{id:number;telegram_user_id:string}>();
      if(!replyRow)return json({ok:false,error:"reply_not_found"},404);
      if(replyRow.telegram_user_id===String(user.id))return json({ok:false,error:"cannot_vote_own_reply"},400);
      const existing=await env.DB.prepare("SELECT vote FROM community_reply_votes WHERE reply_id=? AND telegram_user_id=?").bind(replyId,String(user.id)).first<{vote:number}>();
      const ref="reply-upvote:"+replyId+":"+user.id;
      if(existing?.vote===value){
        await env.DB.prepare("DELETE FROM community_reply_votes WHERE reply_id=? AND telegram_user_id=?").bind(replyId,String(user.id)).run();
        if(value===1){
          const voided=await env.DB.prepare("UPDATE community_reputation_events SET delta=0,reason='helpful_answer_voided' WHERE telegram_user_id=? AND reference_key=? AND delta>0").bind(replyRow.telegram_user_id,ref).run();
          if(Number(voided.meta.changes??0)) await env.DB.prepare("UPDATE community_reputation SET points=MAX(0,points-1),updated_at=CURRENT_TIMESTAMP WHERE telegram_user_id=?").bind(replyRow.telegram_user_id).run();
        }
      } else {
        await env.DB.prepare("INSERT INTO community_reply_votes(reply_id,telegram_user_id,vote) VALUES(?,?,?) ON CONFLICT(reply_id,telegram_user_id) DO UPDATE SET vote=excluded.vote,created_at=CURRENT_TIMESTAMP").bind(replyId,String(user.id),value).run();
        if(value===1) await award(env.DB,Number(replyRow.telegram_user_id),1,"helpful_answer",ref);
      }
      return json({ok:true});
    }
    if(request.method==="POST" && url.pathname==="/api/community-v2/read"){
      const input=await body<Record<string,unknown>>(request); if(!input)return json({ok:false,error:"invalid_json"},400);
      const itemId=Number(input.item_id); if(!Number.isSafeInteger(itemId)||itemId<1)return json({ok:false,error:"invalid_item"},400);
      const item=await env.DB.prepare("SELECT id FROM community_items WHERE id=? AND status='published'").bind(itemId).first();
      if(!item)return json({ok:false,error:"item_not_found"},404);
      await env.DB.prepare("INSERT INTO community_item_reads(item_id,telegram_user_id,last_read_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(item_id,telegram_user_id) DO UPDATE SET last_read_at=CURRENT_TIMESTAMP").bind(itemId,String(user.id)).run();
      return json({ok:true});
    }
    if(request.method==="POST" && url.pathname==="/api/community-v2/solve"){
      const input=await body<Record<string,unknown>>(request); if(!input)return json({ok:false,error:"invalid_json"},400);
      const itemId=Number(input.item_id), replyId=Number(input.reply_id);
      if(!Number.isSafeInteger(itemId)||itemId<1||!Number.isSafeInteger(replyId)||replyId<1)return json({ok:false,error:"invalid_item"},400);
      const owner=await env.DB.prepare("SELECT telegram_user_id FROM community_items WHERE id=? AND status='published'").bind(itemId).first<{telegram_user_id:string}>();
      if(!owner)return json({ok:false,error:"item_not_found"},404);
      if(owner.telegram_user_id!==String(user.id))return json({ok:false,error:"forbidden"},403);
      const replyRow=await env.DB.prepare("SELECT id FROM community_replies WHERE id=? AND item_id=? AND status='published'").bind(replyId,itemId).first();
      if(!replyRow)return json({ok:false,error:"reply_not_found"},404);
      await env.DB.prepare("UPDATE community_items SET solved=1,accepted_reply_id=? WHERE id=?").bind(replyId,itemId).run();
      return json({ok:true,solved:true,accepted_reply_id:replyId});
    }
    if(request.method==="GET" && url.pathname==="/api/community-v2/context"){
      const p=await profile(env.DB,user.id);
      const community=p ? p.branch.toLowerCase().replace(/[^a-z0-9]+/g,"-") + "-year-" + p.year : "campus";
      return json({ok:true,profile:p,community});
    }
    if(request.method==="GET" && url.pathname==="/api/community-v2/feed"){
      const items=await listItems(env.DB,user.id,url.searchParams,env.ANON_ALIAS_SECRET); const last=items.at(-1) as Record<string,unknown>|undefined; const requestedLimit=Math.min(40,Math.max(1,Number(url.searchParams.get("limit")||40))); const nextCursor=(url.searchParams.get("sort")||"new")==="new" && items.length===requestedLimit && last ? btoa(JSON.stringify({created_at:last.created_at,id:last.id})) : null; return json({ok:true,items,next_cursor:nextCursor});
    }
    if(request.method==="GET" && url.pathname==="/api/community-v2/reputation"){
      return json({ok:true,reputation:await reputation(env.DB,user.id)});
    }
    if(request.method==="GET" && url.pathname==="/api/community-v2/replies"){
      const id=safePositiveId(url.searchParams.get("item_id"));
      if(!Number.isSafeInteger(id)||id<1)return json({ok:false,error:"invalid_item"},400);
      const viewerId=String(user.id);
      const item=await env.DB.prepare(`SELECT i.telegram_user_id
        FROM community_items i
        WHERE i.id=? AND i.status='published'
          AND NOT EXISTS (
            SELECT 1 FROM student_profile_blocks b
            WHERE b.blocker_telegram_user_id=? AND b.blocked_telegram_user_id=i.telegram_user_id
          )`).bind(id,viewerId).first<{telegram_user_id:string}>();
      if(!item)return json({ok:false,error:"item_not_found"},404);
      const rows=await env.DB.prepare(`SELECT r.id,r.body,r.anonymous,r.telegram_user_id,r.created_at,
        (SELECT COALESCE(SUM(CASE WHEN rv.vote=1 THEN 1 ELSE 0 END),0) FROM community_reply_votes rv WHERE rv.reply_id=r.id) AS upvotes,
        (SELECT COALESCE(SUM(CASE WHEN rv.vote=-1 THEN 1 ELSE 0 END),0) FROM community_reply_votes rv WHERE rv.reply_id=r.id) AS downvotes,
        (SELECT rv.vote FROM community_reply_votes rv WHERE rv.reply_id=r.id AND rv.telegram_user_id=? LIMIT 1) AS my_vote,
        CASE WHEN r.anonymous=1 THEN 'Anonymous student' ELSE COALESCE(sp.display_name,'VGU student') END author,
        CASE WHEN r.telegram_user_id=? THEN 1 ELSE 0 END AS mine
        FROM community_replies r
        JOIN community_items i ON i.id=r.item_id AND i.status='published'
        LEFT JOIN student_profiles sp ON sp.telegram_user_id=r.telegram_user_id
        WHERE r.item_id=? AND r.status='published'
          AND NOT EXISTS (
            SELECT 1 FROM student_profile_blocks b
            WHERE b.blocker_telegram_user_id=?
              AND b.blocked_telegram_user_id IN (i.telegram_user_id,r.telegram_user_id)
          )
        ORDER BY r.created_at ASC LIMIT 100`).bind(viewerId,viewerId,id,viewerId).all();
      const replies=await Promise.all((rows.results??[]).map(async (row)=>{
        const itemRow=row as Record<string,unknown>;
        const {telegram_user_id:_private,...publicRow}=itemRow;
        if(Number(itemRow.anonymous)){
          publicRow.author=await anonymousAlias(env.ANON_ALIAS_SECRET,Number(itemRow.telegram_user_id),id);
        }
        return publicRow;
      }));
      return json({ok:true,replies});
    }
    if(request.method==="GET" && url.pathname==="/api/community-v2/poll"){
      const id=Number(url.searchParams.get("item_id"));
      if(!Number.isSafeInteger(id)||id<1)return json({ok:false,error:"invalid_item"},400);
      const item=await env.DB.prepare("SELECT id FROM community_items WHERE id=? AND status='published'").bind(id).first();
      if(!item)return json({ok:false,error:"item_not_found"},404);
      const options=await env.DB.prepare(`SELECT o.id,o.label,COUNT(v.telegram_user_id) votes
        FROM community_poll_options o LEFT JOIN community_poll_votes v ON v.option_id=o.id
        WHERE o.item_id=? GROUP BY o.id ORDER BY o.id`).bind(id).all();
      const selected=await env.DB.prepare("SELECT option_id FROM community_poll_votes WHERE item_id=? AND telegram_user_id=?").bind(id,String(user.id)).first<{option_id:number}>();
      return json({ok:true,selected_option_id:selected?.option_id??null,options:options.results??[]});
    }
    if(request.method==="GET" && url.pathname==="/api/community-v2/communities"){
      const rows=await env.DB.prepare("SELECT slug,name,kind,description,rules,official FROM communities WHERE approved=1 ORDER BY official DESC,name LIMIT 100").all();
      return json({ok:true,communities:rows.results??[]});
    }
    if(request.method==="POST" && url.pathname==="/api/community-v2/communities/join"){
      const input=await body<Record<string,unknown>>(request); if(!input)return json({ok:false,error:"invalid_json"},400);
      const slug=communitySlug(input.slug); const row=await env.DB.prepare("SELECT slug FROM communities WHERE slug=? AND approved=1").bind(slug).first();
      if(!row)return json({ok:false,error:"invalid_community"},404);
      await env.DB.prepare("INSERT OR IGNORE INTO community_members(community_slug,telegram_user_id) VALUES(?,?)").bind(slug,String(user.id)).run();
      return json({ok:true,joined:true});
    }
    if(request.method==="DELETE" && url.pathname==="/api/community-v2/communities/join"){
      const slug=communitySlug(url.searchParams.get("slug")); await env.DB.prepare("DELETE FROM community_members WHERE community_slug=? AND telegram_user_id=?").bind(slug,String(user.id)).run();
      return json({ok:true,joined:false});
    }
    if(request.method==="GET" && url.pathname==="/api/community-v2/search"){
      const q=clamp(url.searchParams.get("q"),120);
      return json({ok:true,items:await listItems(env.DB,user.id,new URLSearchParams({q,sort:"trending"}),env.ANON_ALIAS_SECRET)});
    }

    if(request.method==="GET" && url.pathname==="/api/community-v2/legacy-item"){
      const id=Number(url.searchParams.get("post_id"));
      if(!Number.isSafeInteger(id)||id<1)return json({ok:false,error:"invalid_post"},400);
      const item=await env.DB.prepare(`SELECT p.id,p.category,p.title,p.body,p.created_at,
        COALESCE(NULLIF(TRIM(u.first_name || ' ' || COALESCE(u.last_name,'')),''),'VGU student') AS author,
        COALESCE((SELECT SUM(v.vote) FROM student_post_votes v WHERE v.post_id=p.id),0) AS score,
        (SELECT COUNT(*) FROM student_post_replies r WHERE r.post_id=p.id AND r.status='published' AND r.report_count < 3) AS replies
        FROM student_posts p JOIN users u ON u.telegram_user_id=p.telegram_user_id
        WHERE p.id=? AND p.status='published' AND p.report_count < 3`).bind(id).first<Record<string,unknown>>();
      if(!item)return json({ok:false,error:"post_not_found"},404);
      const replies=await env.DB.prepare(`SELECT r.id,r.post_id,r.body,r.created_at,
        COALESCE(NULLIF(TRIM(u.first_name || ' ' || COALESCE(u.last_name,'')),''),'VGU student') AS author
        FROM student_post_replies r JOIN users u ON u.telegram_user_id=r.telegram_user_id
        WHERE r.post_id=? AND r.status='published' AND r.report_count < 3
        ORDER BY r.created_at ASC,r.id ASC LIMIT 50`).bind(id).all<Record<string,unknown>>();
      return json({ok:true,legacy:true,item,replies:replies.results??[]});
    }
    if(request.method==="GET" && url.pathname==="/api/community-v2/items"){
      const id=Number(url.searchParams.get("item_id"));
      if(!Number.isSafeInteger(id)||id<1)return json({ok:false,error:"invalid_item"},400);
      const item=await getItem(env.DB,id,user.id,env.ANON_ALIAS_SECRET);
      if(!item)return json({ok:false,error:"item_not_found"},404);
      return json({ok:true,item});
    }
    if(request.method==="POST" && url.pathname==="/api/community-v2/items"){
      const input=await body<Record<string,unknown>>(request); if(!input)return json({ok:false,error:"invalid_json"},400);
      if(input.anonymous===true || input.kind==="confession"){ const notice=await env.DB.prepare("SELECT 1 FROM community_anonymous_notices WHERE telegram_user_id=?").bind(String(user.id)).first(); if(!notice) return json({ok:false,error:"anonymous_notice_required",notice:"Anonymous to students, still tied to your account on our server; admins may review reports."},428); }
      const rules=await env.DB.prepare("SELECT 1 FROM community_rules_ack WHERE telegram_user_id=?").bind(String(user.id)).first(); if(!rules) return json({ok:false,error:"rules_ack_required"},428);
      const item=await createItem(env.DB,user,input,env.ANON_ALIAS_SECRET);
      return json({ok:true,item},201);
    }
    if(request.method==="PATCH" && url.pathname==="/api/community-v2/items"){
      const input=await body<Record<string,unknown>>(request); if(!input)return json({ok:false,error:"invalid_json"},400);
      const item=await updateItem(env.DB,user,Number(input.item_id),input);
      return json({ok:true,item});
    }
    if(request.method==="POST" && url.pathname==="/api/community-v2/polls"){
      const input=await body<Record<string,unknown>>(request); if(!input)return json({ok:false,error:"invalid_json"},400);
      const item=await poll(env.DB,user,input,env.ANON_ALIAS_SECRET);
      return json({ok:true,item},201);
    }
    if(request.method==="POST" && url.pathname==="/api/community-v2/replies"){
      const input=await body<Record<string,unknown>>(request); if(!input)return json({ok:false,error:"invalid_json"},400);
      const id=Number(input.item_id); if(!Number.isSafeInteger(id)||id<1)return json({ok:false,error:"invalid_item"},400);
      if(typeof input.anonymous!=="boolean")return json({ok:false,error:"invalid_anonymous"},400);
      const rules=await env.DB.prepare("SELECT 1 FROM community_rules_ack WHERE telegram_user_id=?").bind(String(user.id)).first(); if(!rules) return json({ok:false,error:"rules_ack_required"},428);
      const r=await reply(env.DB,user,id,clamp(input.body,LIMITS.body),input.anonymous,env.ANON_ALIAS_SECRET);
      return json({ok:true,reply:r},201);
    }
    if(request.method==="DELETE" && url.pathname==="/api/community-v2/items"){
      const id=Number(url.searchParams.get("item_id"));
      if(!Number.isSafeInteger(id)||id<1)return json({ok:false,error:"invalid_item"},400);
      const item=await env.DB.prepare("SELECT telegram_user_id FROM community_items WHERE id=? AND status='published'").bind(id).first<{telegram_user_id:string}>();
      if(!item)return json({ok:false,error:"item_not_found"},404);
      if(item.telegram_user_id!==String(user.id))return json({ok:false,error:"forbidden"},403);
      await award(env.DB,user.id,-3,"deleted_item",`delete:item:${id}`);
      await env.DB.prepare("DELETE FROM community_items WHERE id=? AND telegram_user_id=?").bind(id,String(user.id)).run();
      return json({ok:true,deleted:true});
    }
    if(request.method==="DELETE" && url.pathname==="/api/community-v2/replies"){
      const id=Number(url.searchParams.get("reply_id"));
      if(!Number.isSafeInteger(id)||id<1)return json({ok:false,error:"invalid_reply"},400);
      const reply=await env.DB.prepare("SELECT telegram_user_id FROM community_replies WHERE id=? AND status='published'").bind(id).first<{telegram_user_id:string}>();
      if(!reply)return json({ok:false,error:"reply_not_found"},404);
      if(reply.telegram_user_id!==String(user.id))return json({ok:false,error:"forbidden"},403);
      await award(env.DB,user.id,-1,"deleted_reply",`delete:reply:${id}`);
      await env.DB.prepare("DELETE FROM community_replies WHERE id=? AND telegram_user_id=?").bind(id,String(user.id)).run();
      return json({ok:true,deleted:true});
    }
    if(request.method==="POST" && url.pathname==="/api/community-v2/vote"){
      const input=await body<Record<string,unknown>>(request); if(!input)return json({ok:false,error:"invalid_json"},400);
      const id=Number(input.item_id); if(!Number.isSafeInteger(id)||id<1)return json({ok:false,error:"invalid_item"},400);
      await vote(env.DB,user.id,id,Number(input.vote)); return json({ok:true});
    }
    if(request.method==="POST" && url.pathname==="/api/community-v2/poll-vote"){
      const input=await body<Record<string,unknown>>(request); if(!input)return json({ok:false,error:"invalid_json"},400);
      const itemId=Number(input.item_id),optionId=Number(input.option_id);
      if(!Number.isSafeInteger(itemId)||itemId<1)return json({ok:false,error:"invalid_item"},400);
      if(!Number.isSafeInteger(optionId)||optionId<1)return json({ok:false,error:"invalid_option"},400);
      await pollVote(env.DB,user.id,itemId,optionId); return json({ok:true});
    }
    if(request.method==="POST" && url.pathname==="/api/community-v2/follow"){
      const input=await body<Record<string,unknown>>(request); if(!input)return json({ok:false,error:"invalid_json"},400);
      const id=Number(input.item_id); if(!Number.isSafeInteger(id)||id<1)return json({ok:false,error:"invalid_item"},400);
      const exists=await env.DB.prepare("SELECT id FROM community_items WHERE id=? AND status='published'").bind(id).first(); if(!exists)return json({ok:false,error:"item_not_found"},404);
      await env.DB.prepare("INSERT OR IGNORE INTO community_follows(item_id,telegram_user_id) VALUES(?,?)").bind(id,String(user.id)).run();
      return json({ok:true,following:true});
    }
    if(request.method==="DELETE" && url.pathname==="/api/community-v2/follow"){
      const id=Number(url.searchParams.get("item_id")); if(!Number.isSafeInteger(id)||id<1)return json({ok:false,error:"invalid_item"},400);
      await env.DB.prepare("DELETE FROM community_follows WHERE item_id=? AND telegram_user_id=?").bind(id,String(user.id)).run();
      return json({ok:true,following:false});
    }
    if(request.method==="POST" && url.pathname==="/api/community-v2/save"){
      const input=await body<Record<string,unknown>>(request); if(!input)return json({ok:false,error:"invalid_json"},400);
      const id=Number(input.item_id); if(!Number.isSafeInteger(id)||id<1)return json({ok:false,error:"invalid_item"},400);
      const exists=await env.DB.prepare("SELECT id FROM community_items WHERE id=? AND status='published'").bind(id).first();
      if(!exists)return json({ok:false,error:"item_not_found"},404);
      await env.DB.prepare("INSERT OR IGNORE INTO community_saves(item_id,telegram_user_id) VALUES(?,?)").bind(id,String(user.id)).run();
      return json({ok:true,saved:true});
    }
    if(request.method==="DELETE" && url.pathname==="/api/community-v2/save"){
      const id=Number(url.searchParams.get("item_id")); if(!Number.isSafeInteger(id)||id<1)return json({ok:false,error:"invalid_item"},400);
      await env.DB.prepare("DELETE FROM community_saves WHERE item_id=? AND telegram_user_id=?").bind(id,String(user.id)).run();
      return json({ok:true,saved:false});
    }
    if(request.method==="POST" && url.pathname==="/api/community-v2/report"){
      const input=await body<Record<string,unknown>>(request); if(!input)return json({ok:false,error:"invalid_json"},400);
      const id=Number(input.item_id); if(!Number.isSafeInteger(id)||id<1)return json({ok:false,error:"invalid_item"},400);
      const recent=await env.DB.prepare("SELECT COUNT(*) count FROM community_reports WHERE telegram_user_id=? AND created_at>=datetime('now','-1 hour')").bind(String(user.id)).first<{count:number}>();
      if(Number(recent?.count??0)>=10)return json({ok:false,error:"rate_limited"},429);
      const reason=clamp(input.reason,LIMITS.reason)||"other";
      const owner=await env.DB.prepare("SELECT telegram_user_id FROM community_items WHERE id=? AND status='published'").bind(id).first<{telegram_user_id:string}>();
      if(!owner)return json({ok:false,error:"item_not_found"},404);
      if(owner.telegram_user_id===String(user.id))return json({ok:false,error:"cannot_report_own_item"},400);
      const result=await env.DB.prepare("INSERT OR IGNORE INTO community_reports(item_id,telegram_user_id,reason) VALUES(?,?,?)").bind(id,String(user.id),reason).run();
      if(Number(result.meta.changes??0)){
        await env.DB.prepare("INSERT INTO moderation_report_history(reporter_telegram_user_id,target_type,target_id,reason) VALUES(?,?,?,?)").bind(String(user.id),"item",String(id),reason).run();
        const reporters=await env.DB.prepare("SELECT COUNT(DISTINCT r.telegram_user_id) count,COALESCE(SUM(MIN(5.0,1.0+COALESCE(rep.points,0)/100.0+MAX(0.0,julianday('now')-julianday(u.created_at))/365.0*0.5)),0) weight FROM community_reports r JOIN users u ON u.telegram_user_id=r.telegram_user_id LEFT JOIN community_reputation rep ON rep.telegram_user_id=r.telegram_user_id WHERE r.item_id=?").bind(id).first<{count:number;weight:number}>();
        await env.DB.prepare("UPDATE community_items SET report_count=? ,status=CASE WHEN ? >= 3 AND ? >= 3 THEN 'review' ELSE status END WHERE id=?").bind(Number(reporters?.count??0),Number(reporters?.count??0),Number(reporters?.weight??0),id).run();
      }
      return json({ok:true});
    }
    if(request.method==="POST" && url.pathname==="/api/community-v2/report-reply"){
      const input=await body<Record<string,unknown>>(request); if(!input)return json({ok:false,error:"invalid_json"},400);
      const id=Number(input.reply_id); if(!Number.isSafeInteger(id)||id<1)return json({ok:false,error:"invalid_reply"},400);
      const owner=await env.DB.prepare("SELECT telegram_user_id FROM community_replies WHERE id=? AND status='published'").bind(id).first<{telegram_user_id:string}>();
      if(!owner)return json({ok:false,error:"reply_not_found"},404);
      if(owner.telegram_user_id===String(user.id))return json({ok:false,error:"cannot_report_own_reply"},400);
      const recent=await env.DB.prepare("SELECT COUNT(*) count FROM community_reply_reports WHERE telegram_user_id=? AND created_at>=datetime('now','-1 hour')").bind(String(user.id)).first<{count:number}>();
      if(Number(recent?.count??0)>=10)return json({ok:false,error:"rate_limited"},429);
      const result=await env.DB.prepare("INSERT OR IGNORE INTO community_reply_reports(reply_id,telegram_user_id) VALUES(?,?)").bind(id,String(user.id)).run();
      if(Number(result.meta.changes??0)){
        await env.DB.prepare("INSERT INTO moderation_report_history(reporter_telegram_user_id,target_type,target_id,reason) VALUES(?,?,?,?)").bind(String(user.id),"reply",String(id),"other").run();
        const reporters=await env.DB.prepare("SELECT COUNT(DISTINCT r.telegram_user_id) count,COALESCE(SUM(MIN(5.0,1.0+COALESCE(rep.points,0)/100.0+MAX(0.0,julianday('now')-julianday(u.created_at))/365.0*0.5)),0) weight FROM community_reply_reports r JOIN users u ON u.telegram_user_id=r.telegram_user_id LEFT JOIN community_reputation rep ON rep.telegram_user_id=r.telegram_user_id WHERE r.reply_id=?").bind(id).first<{count:number;weight:number}>();
        await env.DB.prepare("UPDATE community_replies SET report_count=? ,status=CASE WHEN ? >= 3 AND ? >= 3 THEN 'review' ELSE status END WHERE id=? AND status='published'").bind(Number(reporters?.count??0),Number(reporters?.count??0),Number(reporters?.weight??0),id).run();
      }
      return json({ok:true});
    }
    if(request.method==="POST" && url.pathname==="/api/community-v2/block"){
      const input=await body<Record<string,unknown>>(request); if(!input)return json({ok:false,error:"invalid_json"},400);
      const id=Number(input.item_id); if(!Number.isSafeInteger(id)||id<1)return json({ok:false,error:"invalid_item"},400);
      const owner=await env.DB.prepare("SELECT telegram_user_id,anonymous FROM community_items WHERE id=?").bind(id).first<{telegram_user_id:string;anonymous:number}>();
      if(!owner || owner.telegram_user_id===String(user.id)) return json({ok:false,error:"invalid_target"},400);
      await env.DB.prepare("INSERT OR IGNORE INTO student_profile_blocks(blocker_telegram_user_id,blocked_telegram_user_id,via_anonymous,source_item_id) VALUES(?,?,?,?)").bind(String(user.id),owner.telegram_user_id,Number(owner.anonymous),Number(owner.anonymous)?id:null).run();
      return json({ok:true});
    }
    if(request.method==="GET" && url.pathname==="/api/community-v2/preferences"){
      const row=await env.DB.prepare("SELECT official_updates,community_replies,community_activity,personalized_alerts FROM notification_preferences WHERE telegram_user_id=?").bind(String(user.id)).first<{official_updates:number;community_replies:number;community_activity:number;personalized_alerts:number}>();
      return json({ok:true,preferences:{official_updates:Boolean(row?.official_updates),community_replies:Boolean(row?.community_replies),community_activity:Boolean(row?.community_activity),personalized_alerts:Boolean(row?.personalized_alerts)}});
    }
    if(request.method==="POST" && url.pathname==="/api/community-v2/preferences"){
      const input=await body<Record<string,unknown>>(request); if(!input)return json({ok:false,error:"invalid_json"},400);
      await env.DB.prepare("INSERT OR IGNORE INTO notification_preferences(telegram_user_id) VALUES(?)").bind(String(user.id)).run();
      const keys=["official_updates","community_replies","community_activity","personalized_alerts"] as const;
      for(const key of keys) if(input[key]!==undefined && typeof input[key]!=="boolean") return json({ok:false,error:"invalid_preferences"},400);
      await env.DB.prepare("INSERT OR IGNORE INTO notification_preferences(telegram_user_id) VALUES(?)").bind(String(user.id)).run();
      const current=await env.DB.prepare("SELECT official_updates,community_replies,community_activity,personalized_alerts FROM notification_preferences WHERE telegram_user_id=?").bind(String(user.id)).first<Record<string,number>>();
      const next:Record<string,boolean>={official_updates:current?.official_updates===1,community_replies:current?.community_replies===1,community_activity:current?.community_activity===1,personalized_alerts:current?.personalized_alerts===1};
      for(const key of keys) if(input[key]!==undefined) next[key]=input[key] as boolean;
      await env.DB.prepare("UPDATE notification_preferences SET official_updates=?,community_replies=?,community_activity=?,personalized_alerts=?,updated_at=CURRENT_TIMESTAMP WHERE telegram_user_id=?").bind(next.official_updates?1:0,next.community_replies?1:0,next.community_activity?1:0,next.personalized_alerts?1:0,String(user.id)).run();
      return json({ok:true,preferences:next});
    }
    return json({ok:false,error:"not_found"},404);
  } catch (error) {
    const message=error instanceof Error?error.message:"unknown";
    const requestId=crypto.randomUUID();
    console.error(JSON.stringify({event:"community_v2_error",request_id:requestId,error:message}));
    const publicErrors=new Set(["rate_limited","unsafe_content","forbidden","item_not_found","reply_not_found","invalid_item","invalid_reply","invalid_vote","invalid_poll","invalid_option","cannot_report_own_item","cannot_report_own_reply","invalid_community","poll_closed","invalid_preferences","invalid_cursor"]);
    const status=message==="rate_limited"?429:message==="unsafe_content"?422:message==="forbidden"?403:message==="item_not_found"||message==="reply_not_found"?404:publicErrors.has(message)?400:500;
    return json({ok:false,error:publicErrors.has(message)?message:"internal_error",request_id:requestId},status);
  }
}
