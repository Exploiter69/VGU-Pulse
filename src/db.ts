import { createCommunityReplyNotification } from "./notifications";

export interface StudentPost {
  id: number;
  category: "question" | "info" | "opportunity" | "request";
  title: string;
  body: string;
  author_name: string;
  created_at: string;
  report_count: number;
  reply_count?: number;
  upvotes?: number;
  downvotes?: number;
  score?: number;
  viewer_vote?: -1 | 0 | 1;
  owned?: boolean;
}

export interface StudentReply {
  id: number;
  post_id: number;
  body: string;
  author_name: string;
  created_at: string;
  report_count: number;
  upvotes?: number;
  downvotes?: number;
  score?: number;
  viewer_vote?: -1 | 0 | 1;
  owned?: boolean;
}


export interface StudentProfile {
  public_id: string;
  display_name: string;
  program: string;
  branch: string;
  year: number;
  bio: string;
  looking_for: string;
  updated_at: string;
  status?: "published" | "hidden";
}

export function validateStudentProfileInput(input: {
  display_name?: unknown; program?: unknown; branch?: unknown; year?: unknown;
  bio?: unknown; looking_for?: unknown;
}): Omit<StudentProfile, "public_id" | "telegram_user_id" | "updated_at"> | null {
  if (typeof input.display_name !== "string" || typeof input.program !== "string" ||
      typeof input.branch !== "string" || typeof input.year !== "number" ||
      typeof input.bio !== "string" || typeof input.looking_for !== "string") return null;
  const display_name = input.display_name.trim();
  if (/\b(?:exam\s*cell|admin|administrator|vgu|official|controller\s*of\s*examinations)\b/i.test(display_name)) return null;
  const program = input.program.trim();
  const branch = input.branch.trim();
  const bio = input.bio.trim();
  const looking_for = input.looking_for.trim();
  if (display_name.length < 2 || display_name.length > 80 ||
      program.length < 2 || program.length > 80 ||
      branch.length < 2 || branch.length > 80 ||
      !Number.isInteger(input.year) || input.year < 1 || input.year > 6 ||
      bio.length > 300 || looking_for.length < 2 || looking_for.length > 160) return null;
  return { display_name, program, branch, year: input.year, bio, looking_for };
}

export async function upsertStudentProfile(
  db: D1Database, userId: number,
  input: Omit<StudentProfile, "public_id" | "telegram_user_id" | "updated_at">,
): Promise<StudentProfile> {
  await db.prepare(
    `INSERT INTO student_profiles
      (public_id, telegram_user_id, display_name, program, branch, year, bio, looking_for)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(telegram_user_id) DO UPDATE SET
       display_name=excluded.display_name, program=excluded.program,
       branch=excluded.branch, year=excluded.year, bio=excluded.bio,
       looking_for=excluded.looking_for, updated_at=CURRENT_TIMESTAMP`,
  ).bind(crypto.randomUUID(), String(userId), input.display_name, input.program, input.branch,
    input.year, input.bio, input.looking_for).run();
  const profile = await db.prepare(
    `SELECT public_id, display_name, program, branch, year, bio, looking_for, updated_at
     FROM student_profiles WHERE telegram_user_id = ?`,
  ).bind(String(userId)).first<StudentProfile>();
  if (!profile) throw new Error("profile_save_failed");
  return profile;
}

export async function getStudentProfile(db: D1Database, userId: number): Promise<StudentProfile | null> {
  return db.prepare(
    `SELECT public_id, telegram_user_id, display_name, program, branch, year, bio, looking_for, updated_at, status
     FROM student_profiles WHERE telegram_user_id = ?`,
  ).bind(String(userId)).first<StudentProfile>();
}

export async function listStudentProfiles(
  db: D1Database,
  limit = 30,
  viewerUserId?: number,
  filters?: { q?: string; program?: string; branch?: string; year?: number },
): Promise<StudentProfile[]> {
  const q = filters?.q?.trim() || null;
  const program = filters?.program?.trim() || null;
  const branch = filters?.branch?.trim() || null;
  const year = filters?.year ?? null;
  const viewer = viewerUserId === undefined ? null : String(viewerUserId);
  const rows = await db.prepare(
    `SELECT p.public_id, p.display_name, p.program, p.branch, p.year, p.bio, p.looking_for, p.updated_at
     FROM student_profiles p
     WHERE p.status = 'published' AND p.report_count < 3
       AND (? IS NULL OR LOWER(p.program) LIKE '%' || LOWER(?) || '%')
       AND (? IS NULL OR LOWER(p.branch) LIKE '%' || LOWER(?) || '%')
       AND (? IS NULL OR p.year = ?)
       AND (? IS NULL OR LOWER(p.display_name || ' ' || p.program || ' ' || p.branch || ' ' || p.looking_for || ' ' || p.bio) LIKE '%' || LOWER(?) || '%')
       AND (? IS NULL OR NOT EXISTS (
         SELECT 1 FROM student_profile_blocks b
         JOIN student_profiles bp ON bp.telegram_user_id = b.blocked_telegram_user_id
         WHERE b.blocker_telegram_user_id = ? AND bp.telegram_user_id = p.telegram_user_id
       ))
       AND (? IS NULL OR NOT EXISTS (
         SELECT 1 FROM student_profile_blocks b
         WHERE b.blocker_telegram_user_id = p.telegram_user_id AND b.blocked_telegram_user_id = ?
       ))
     ORDER BY p.updated_at DESC, p.public_id LIMIT ?`,
  ).bind(
    program, program, branch, branch, year, year, q, q,
    viewer, viewer, viewer, viewer,
    Math.min(Math.max(limit, 1), 50),
  ).all<StudentProfile>();
  return rows.results;
}

export async function listBlockedProfiles(db: D1Database, userId: number): Promise<Array<{ block_id: number; public_id: string | null; display_name: string }>> {
  const rows = await db.prepare(
    `SELECT b.id AS block_id,
      CASE WHEN b.via_anonymous=1 THEN NULL ELSE p.public_id END AS public_id,
      CASE WHEN b.via_anonymous=1 THEN 'Anonymous author (from post #' || COALESCE(b.source_item_id,'?') || ')' ELSE COALESCE(p.display_name,'VGU student') END AS display_name
     FROM student_profile_blocks b
     LEFT JOIN student_profiles p ON p.telegram_user_id = b.blocked_telegram_user_id
     WHERE b.blocker_telegram_user_id = ?
     ORDER BY b.id DESC`,
  ).bind(String(userId)).all<{ block_id:number; public_id:string|null; display_name:string }>();
  return rows.results;
}

export async function unblockStudentProfileBlock(db: D1Database,userId:number,blockId:number):Promise<boolean>{
  const result=await db.prepare("DELETE FROM student_profile_blocks WHERE id=? AND blocker_telegram_user_id=?").bind(blockId,String(userId)).run();
  return Number(result.meta.changes??0)>0;
}

export async function setStudentProfileVisibility(db: D1Database, userId: number, visible: boolean): Promise<boolean> {
  const result = await db.prepare(
    `UPDATE student_profiles SET status = ? WHERE telegram_user_id = ?`,
  ).bind(visible ? "published" : "hidden", String(userId)).run();
  return result.meta.changes > 0;
}

export async function blockStudentProfile(db: D1Database, blockerUserId: number, blockedPublicId: string): Promise<boolean> {
  const target = await db.prepare(
    `SELECT telegram_user_id FROM student_profiles WHERE public_id = ?`,
  ).bind(blockedPublicId).first<{ telegram_user_id: string }>();
  if (!target || target.telegram_user_id === String(blockerUserId)) return false;
  const result = await db.prepare(
    `INSERT OR IGNORE INTO student_profile_blocks (blocker_telegram_user_id, blocked_telegram_user_id)
     VALUES (?, ?)`,
  ).bind(String(blockerUserId), target.telegram_user_id).run();
  return result.meta.changes > 0;
}

export async function unblockStudentProfile(db: D1Database, blockerUserId: number, blockedPublicId: string): Promise<boolean> {
  const target = await db.prepare(
    `SELECT telegram_user_id FROM student_profiles WHERE public_id = ?`,
  ).bind(blockedPublicId).first<{ telegram_user_id: string }>();
  if (!target) return false;
  const result = await db.prepare(
    `DELETE FROM student_profile_blocks WHERE blocker_telegram_user_id = ? AND blocked_telegram_user_id = ?`,
  ).bind(String(blockerUserId), target.telegram_user_id).run();
  return result.meta.changes > 0;
}

export async function reportStudentProfile(db: D1Database, profilePublicId: string, reporterUserId: number): Promise<void> {
  const profile = await db.prepare(
    `SELECT telegram_user_id FROM student_profiles WHERE public_id=?`,
  ).bind(profilePublicId).first<{ telegram_user_id: string }>();
  if (!profile || profile.telegram_user_id === String(reporterUserId)) return;

  const recentReports = await db.prepare(
    "SELECT COUNT(*) AS count FROM student_profile_reports WHERE reporter_telegram_user_id = ? AND created_at >= datetime('now', '-1 hour')",
  ).bind(String(reporterUserId)).first<{ count: number }>();
  if (Number(recentReports?.count ?? 0) >= 30) throw new Error("rate_limited");

  const result = await db.prepare(
    `INSERT OR IGNORE INTO student_profile_reports (profile_public_id, reporter_telegram_user_id)
     VALUES (?, ?)`,
  ).bind(profilePublicId, String(reporterUserId)).run();
  if (result.meta.changes > 0) {
    await db.prepare(
      `UPDATE student_profiles SET report_count=report_count+1,
       status=CASE WHEN report_count+1 >= 3 THEN 'hidden' ELSE status END
       WHERE public_id=?`,
    ).bind(profilePublicId).run();
  }
}

export interface PulsePoll {
  id: number;
  question: string;
  status: "open" | "closed";
  options: Array<{ id: number; label: string; votes: number }>;
  total_votes: number;
  selected_option_id: number | null;
}

export function validateStudentReplyInput(input: { body?: unknown }): { body: string } | null {
  if (typeof input.body !== "string") return null;
  const body = input.body.trim();
  if (body.length < 1 || body.length > 1000) return null;
  return { body };
}

export function validateStudentPostInput(input: {
  category?: unknown;
  title?: unknown;
  body?: unknown;
}): { category: StudentPost["category"]; title: string; body: string } | null {
  const categories = new Set<StudentPost["category"]>([
    "question",
    "info",
    "opportunity",
    "request",
  ]);
  if (typeof input.category !== "string" || !categories.has(input.category as StudentPost["category"])) {
    return null;
  }
  if (typeof input.title !== "string" || typeof input.body !== "string") return null;
  const title = input.title.trim();
  const body = input.body.trim();
  if (title.length < 3 || title.length > 120 || body.length < 3 || body.length > 2000) {
    return null;
  }
  return { category: input.category as StudentPost["category"], title, body };
}

export async function createStudentPost(
  db: D1Database,
  userId: number,
  input: { category: StudentPost["category"]; title: string; body: string },
): Promise<StudentPost> {
  const recent = await db.prepare(
    "SELECT COUNT(*) AS count FROM student_posts WHERE telegram_user_id = ? AND created_at >= datetime('now', '-1 hour')",
  ).bind(String(userId)).first<{ count: number }>();
  if (Number(recent?.count ?? 0) >= 10) throw new Error("rate_limited");

  const result = await db
    .prepare(
      `INSERT INTO student_posts (telegram_user_id, category, title, body)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(String(userId), input.category, input.title, input.body)
    .run();

  const post = await db
    .prepare(
      `SELECT p.id, p.category, p.title, p.body,
              COALESCE(NULLIF(TRIM(u.first_name || ' ' || COALESCE(u.last_name, '')), ''), 'VGU student') AS author_name,
              p.created_at, p.report_count,
              (SELECT COUNT(*) FROM student_post_replies r WHERE r.post_id = p.id AND r.status = 'published' AND r.report_count < 3) AS reply_count,
              CASE WHEN ? IS NOT NULL AND p.telegram_user_id = ? THEN 1 ELSE 0 END AS owned
       FROM student_posts p
       JOIN users u ON u.telegram_user_id = p.telegram_user_id
       WHERE p.id = ?`,
    )
    .bind(String(userId), String(userId), result.meta.last_row_id)
    .first<StudentPost>();
  if (!post) throw new Error("post_create_failed");
  return { ...post, report_count: Number(post.report_count) };
}

export async function deleteAllStudentData(db:D1Database,userId:number):Promise<void>{
  const id=String(userId);
  const statements=[
    "DELETE FROM community_poll_votes WHERE telegram_user_id=?",
    "DELETE FROM community_votes WHERE telegram_user_id=?",
    "DELETE FROM community_follows WHERE telegram_user_id=?",
    "DELETE FROM community_saves WHERE telegram_user_id=?",
    "DELETE FROM community_reports WHERE telegram_user_id=?",
    "DELETE FROM community_reply_reports WHERE telegram_user_id=?",
    "DELETE FROM student_profile_blocks WHERE blocker_telegram_user_id=? OR blocked_telegram_user_id=?",
    "DELETE FROM student_profile_reports WHERE reporter_telegram_user_id=?",
    "DELETE FROM student_post_reply_votes WHERE telegram_user_id=?",
    "DELETE FROM student_post_votes WHERE telegram_user_id=?",
    "DELETE FROM student_notifications WHERE telegram_user_id=?",
    "DELETE FROM notification_preferences WHERE telegram_user_id=?",
    "DELETE FROM community_badges WHERE telegram_user_id=?",
    "DELETE FROM community_reputation_events WHERE telegram_user_id=?",
    "DELETE FROM community_reputation WHERE telegram_user_id=?",
    "DELETE FROM community_anonymous_notices WHERE telegram_user_id=?",
    "DELETE FROM community_rules_ack WHERE telegram_user_id=?",
    "DELETE FROM community_replies WHERE telegram_user_id=?",
    "DELETE FROM community_items WHERE telegram_user_id=?",
    "DELETE FROM student_post_replies WHERE telegram_user_id=?",
    "DELETE FROM student_posts WHERE telegram_user_id=?",
    "DELETE FROM student_profiles WHERE telegram_user_id=?",
    "DELETE FROM users WHERE telegram_user_id=?",
  ];
  const batch=statements.map(sql=>db.prepare(sql).bind(sql.includes("OR blocked")?id:id, ...(sql.includes("OR blocked")?[id]:[])));
  await db.batch(batch);
}

export async function deleteStudentProfile(db: D1Database, userId: number): Promise<boolean> {
  const result = await db.prepare(
    `DELETE FROM student_profiles WHERE telegram_user_id = ?`,
  ).bind(String(userId)).run();
  return result.meta.changes > 0;
}

export async function listStudentPosts(
  db: D1Database,
  limit = 20,
  category?: StudentPost["category"],
  userId?: number,
  sort: "newest" | "active" | "unanswered" | "useful" = "newest",
): Promise<StudentPost[]> {
  const rows = await db
    .prepare(
      `SELECT p.id, p.category, p.title, p.body,
              COALESCE(NULLIF(TRIM(u.first_name || ' ' || COALESCE(u.last_name, '')), ''), 'VGU student') AS author_name,
              p.created_at, p.report_count,
              (SELECT COUNT(*) FROM student_post_replies r WHERE r.post_id = p.id AND r.status = 'published' AND r.report_count < 3) AS reply_count,
              (SELECT COUNT(*) FROM student_post_votes v WHERE v.post_id = p.id AND v.vote = 1) AS upvotes,
              (SELECT COUNT(*) FROM student_post_votes v WHERE v.post_id = p.id AND v.vote = -1) AS downvotes,
              (SELECT COALESCE(v.vote, 0) FROM student_post_votes v WHERE v.post_id = p.id AND v.telegram_user_id = ?) AS viewer_vote,
              CASE WHEN ? IS NOT NULL AND p.telegram_user_id = ? THEN 1 ELSE 0 END AS owned
       FROM student_posts p
       JOIN users u ON u.telegram_user_id = p.telegram_user_id
       WHERE p.status = 'published' AND p.report_count < 3
         AND (? IS NULL OR p.category = ?)
       ORDER BY
         CASE WHEN ? = "useful" THEN
           ((SELECT COUNT(*) FROM student_post_votes v WHERE v.post_id = p.id AND v.vote = 1)
           - (SELECT COUNT(*) FROM student_post_votes v WHERE v.post_id = p.id AND v.vote = -1))
         ELSE 0 END DESC,
         CASE WHEN ? = "active" THEN reply_count ELSE 0 END DESC,
         CASE WHEN ? = "unanswered" THEN CASE WHEN reply_count = 0 THEN 0 ELSE 1 END ELSE 0 END ASC,
         p.created_at DESC, p.id DESC
       LIMIT ?`,
    )
    .bind(
      userId === undefined ? null : String(userId),
      userId === undefined ? null : String(userId),
      userId === undefined ? null : String(userId),
      category ?? null,
      category ?? null,
      sort,
      sort,
      sort,
      Math.min(Math.max(limit, 1), 50),
    )
    .all<StudentPost>();
  return rows.results.map((post) => ({
    ...post,
    report_count: Number(post.report_count),
    reply_count: Number(post.reply_count ?? 0),
    upvotes: Number(post.upvotes ?? 0),
    downvotes: Number(post.downvotes ?? 0),
    score: Number(post.upvotes ?? 0) - Number(post.downvotes ?? 0),
    viewer_vote: (Number(post.viewer_vote ?? 0) as -1 | 0 | 1),
    ...(userId !== undefined ? { owned: Boolean(post.owned) } : {}),
  }));
}

export async function getStudentPostById(db:D1Database,postId:number,userId?:number):Promise<StudentPost|null>{
  const viewer=userId===undefined?null:String(userId);
  const row=await db.prepare(
    `SELECT p.id,p.category,p.title,p.body,
      COALESCE(NULLIF(TRIM(u.first_name || ' ' || COALESCE(u.last_name,'')),''),'VGU student') AS author_name,
      p.created_at,p.report_count,
      (SELECT COUNT(*) FROM student_post_replies r WHERE r.post_id=p.id AND r.status='published' AND r.report_count<3) AS reply_count,
      (SELECT COUNT(*) FROM student_post_votes v WHERE v.post_id=p.id AND v.vote=1) AS upvotes,
      (SELECT COUNT(*) FROM student_post_votes v WHERE v.post_id=p.id AND v.vote=-1) AS downvotes,
      (SELECT COALESCE(v.vote,0) FROM student_post_votes v WHERE v.post_id=p.id AND v.telegram_user_id=?) AS viewer_vote,
      CASE WHEN ? IS NOT NULL AND p.telegram_user_id=? THEN 1 ELSE 0 END AS owned
     FROM student_posts p JOIN users u ON u.telegram_user_id=p.telegram_user_id
     WHERE p.id=? AND p.status='published' AND p.report_count<3`
  ).bind(viewer,viewer,viewer,postId).first<StudentPost>();
  if(!row)return null;
  return {...row,report_count:Number(row.report_count),reply_count:Number(row.reply_count??0),upvotes:Number(row.upvotes??0),downvotes:Number(row.downvotes??0),score:Number(row.upvotes??0)-Number(row.downvotes??0),viewer_vote:Number(row.viewer_vote??0) as -1|0|1,...(userId!==undefined?{owned:Boolean(row.owned)}:{})};
}

export async function getStudentReplyById(db:D1Database,replyId:number,userId?:number):Promise<StudentReply|null>{
  const viewer=userId===undefined?null:String(userId);
  const row=await db.prepare(
    `SELECT r.id,r.post_id,r.body,
      COALESCE(NULLIF(TRIM(u.first_name || ' ' || COALESCE(u.last_name,'')),''),'VGU student') AS author_name,
      r.created_at,r.report_count,
      (SELECT COUNT(*) FROM student_post_reply_votes v WHERE v.reply_id=r.id AND v.vote=1) AS upvotes,
      (SELECT COUNT(*) FROM student_post_reply_votes v WHERE v.reply_id=r.id AND v.vote=-1) AS downvotes,
      (SELECT COALESCE(v.vote,0) FROM student_post_reply_votes v WHERE v.reply_id=r.id AND v.telegram_user_id=?) AS viewer_vote,
      CASE WHEN ? IS NOT NULL AND r.telegram_user_id=? THEN 1 ELSE 0 END AS owned
     FROM student_post_replies r LEFT JOIN users u ON u.telegram_user_id=r.telegram_user_id
     WHERE r.id=? AND r.status='published' AND r.report_count<3`
  ).bind(viewer,viewer,viewer,replyId).first<StudentReply>();
  if(!row)return null;
  return {...row,report_count:Number(row.report_count),upvotes:Number(row.upvotes??0),downvotes:Number(row.downvotes??0),score:Number(row.upvotes??0)-Number(row.downvotes??0),viewer_vote:Number(row.viewer_vote??0) as -1|0|1,...(userId!==undefined?{owned:Boolean(row.owned)}:{})};
}

export async function voteStudentPost(db: D1Database, postId: number, userId: number, vote: -1 | 1): Promise<void> {
  const post = await db.prepare(
    `SELECT id FROM student_posts WHERE id = ? AND status = 'published' AND report_count < 3`,
  ).bind(postId).first<{ id: number }>();
  if (!post) throw new Error("post_not_found");

  const existing = await db.prepare(
    `SELECT vote FROM student_post_votes WHERE post_id = ? AND telegram_user_id = ?`,
  ).bind(postId, String(userId)).first<{ vote: number }>();

  if (existing?.vote === vote) {
    await db.prepare(
      `DELETE FROM student_post_votes WHERE post_id = ? AND telegram_user_id = ?`,
    ).bind(postId, String(userId)).run();
    return;
  }

  await db.prepare(
    `INSERT INTO student_post_votes (post_id, telegram_user_id, vote)
     VALUES (?, ?, ?)
     ON CONFLICT(post_id, telegram_user_id) DO UPDATE SET vote = excluded.vote, created_at = CURRENT_TIMESTAMP`,
  ).bind(postId, String(userId), vote).run();
}

export async function findRelatedStudentPosts(
  db: D1Database,
  title: string,
  body: string,
  excludePostId?: number,
): Promise<StudentPost[]> {
  const candidates = await listStudentPosts(db, 50, undefined, undefined, "newest");
  const tokenize = (value: string) =>
    new Set(value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").split(/\s+/)
      .filter((word) => word.length >= 3)
      .filter((word) => !["the", "and", "for", "with", "from", "what", "when", "where", "how", "can", "does", "this", "that"].includes(word)));
  const queryTokens = tokenize(title + " " + body);
  if (!queryTokens.size) return [];
  return candidates
    .filter((post) => post.id !== excludePostId)
    .map((post) => {
      const tokens = tokenize(post.title + " " + post.body);
      let overlap = 0;
      for (const token of queryTokens) if (tokens.has(token)) overlap++;
      const score = overlap / Math.max(queryTokens.size, tokens.size);
      return { post, similarity: score };
    })
    .filter((item) => item.similarity >= 0.25)
    .sort((a, b) => b.similarity - a.similarity || (b.post.score ?? 0) - (a.post.score ?? 0))
    .slice(0, 5)
    .map((item) => item.post);
}

export async function deleteStudentPost(db: D1Database, postId: number, userId: number): Promise<boolean> {
  const result = await db.prepare(
    `DELETE FROM student_posts WHERE id = ? AND telegram_user_id = ?`,
  ).bind(postId, String(userId)).run();
  return result.meta.changes > 0;
}

export async function listStudentReplies(
  db: D1Database,
  postId: number,
  limit = 50,
  userId?: number,
): Promise<StudentReply[]> {
  const rows = await db
    .prepare(
      `SELECT r.id, r.post_id, r.body,
              COALESCE(NULLIF(TRIM(u.first_name || ' ' || COALESCE(u.last_name, '')), ''), 'VGU student') AS author_name,
              r.created_at, r.report_count,
              (SELECT COUNT(*) FROM student_post_reply_votes v WHERE v.reply_id = r.id AND v.vote = 1) AS upvotes,
              (SELECT COUNT(*) FROM student_post_reply_votes v WHERE v.reply_id = r.id AND v.vote = -1) AS downvotes,
              (SELECT COALESCE(v.vote, 0) FROM student_post_reply_votes v WHERE v.reply_id = r.id AND v.telegram_user_id = ?) AS viewer_vote,
              CASE WHEN ? IS NOT NULL AND r.telegram_user_id = ? THEN 1 ELSE 0 END AS owned
       FROM student_post_replies r
       LEFT JOIN users u ON u.telegram_user_id = r.telegram_user_id
       WHERE r.post_id = ? AND r.status = 'published' AND r.report_count < 3
       ORDER BY (upvotes - downvotes) DESC, r.created_at ASC, r.id ASC
       LIMIT ?`,
    )
    .bind(
      userId === undefined ? null : String(userId),
      userId === undefined ? null : String(userId),
      userId === undefined ? null : String(userId),
      postId,
      Math.min(Math.max(limit, 1), 50),
    )
    .all<StudentReply>();
  return rows.results.map((reply) => ({
    ...reply,
    report_count: Number(reply.report_count),
    upvotes: Number(reply.upvotes ?? 0),
    downvotes: Number(reply.downvotes ?? 0),
    score: Number(reply.upvotes ?? 0) - Number(reply.downvotes ?? 0),
    viewer_vote: (Number(reply.viewer_vote ?? 0) as -1 | 0 | 1),
    ...(userId !== undefined ? { owned: Boolean(reply.owned) } : {}),
  }));
}

export async function voteStudentReply(db: D1Database, replyId: number, userId: number, vote: -1 | 1): Promise<void> {
  const reply = await db.prepare(
    `SELECT id FROM student_post_replies WHERE id = ? AND status = 'published' AND report_count < 3`,
  ).bind(replyId).first<{ id: number }>();
  if (!reply) throw new Error("reply_not_found");

  const existing = await db.prepare(
    `SELECT vote FROM student_post_reply_votes WHERE reply_id = ? AND telegram_user_id = ?`,
  ).bind(replyId, String(userId)).first<{ vote: number }>();

  if (existing?.vote === vote) {
    await db.prepare(
      `DELETE FROM student_post_reply_votes WHERE reply_id = ? AND telegram_user_id = ?`,
    ).bind(replyId, String(userId)).run();
    return;
  }

  await db.prepare(
    `INSERT INTO student_post_reply_votes (reply_id, telegram_user_id, vote)
     VALUES (?, ?, ?)
     ON CONFLICT(reply_id, telegram_user_id) DO UPDATE SET vote = excluded.vote, created_at = CURRENT_TIMESTAMP`,
  ).bind(replyId, String(userId), vote).run();
}

export async function createStudentReply(
  db: D1Database,
  postId: number,
  userId: number,
  body: string,
): Promise<StudentReply> {
  const post = await db
    .prepare(`SELECT id FROM student_posts WHERE id = ? AND status = 'published'`)
    .bind(postId)
    .first<{ id: number }>();
  if (!post) throw new Error("post_not_found");

  const recent = await db.prepare(
    "SELECT COUNT(*) AS count FROM student_post_replies WHERE telegram_user_id = ? AND created_at >= datetime('now', '-1 hour')",
  ).bind(String(userId)).first<{ count: number }>();
  if (Number(recent?.count ?? 0) >= 30) throw new Error("rate_limited");

  const result = await db
    .prepare(
      `INSERT INTO student_post_replies (post_id, telegram_user_id, body)
       VALUES (?, ?, ?)`,
    )
    .bind(postId, String(userId), body)
    .run();

  const reply = await db
    .prepare(
      `SELECT r.id, r.post_id, r.body,
              COALESCE(NULLIF(TRIM(u.first_name || ' ' || COALESCE(u.last_name, '')), ''), 'VGU student') AS author_name,
              r.created_at, r.report_count
       FROM student_post_replies r
       JOIN users u ON u.telegram_user_id = r.telegram_user_id
       WHERE r.id = ?`,
    )
    .bind(result.meta.last_row_id)
    .first<StudentReply>();
  if (!reply) throw new Error("reply_create_failed");
  await createCommunityReplyNotification(db, postId, result.meta.last_row_id as number, userId, body);
  return { ...reply, report_count: Number(reply.report_count) };
}

export async function deleteStudentReply(db: D1Database, replyId: number, userId: number): Promise<boolean> {
  const result = await db.prepare(
    `DELETE FROM student_post_replies WHERE id = ? AND telegram_user_id = ?`,
  ).bind(replyId, String(userId)).run();
  return result.meta.changes > 0;
}

export async function reportStudentReply(
  db: D1Database,
  replyId: number,
  userId: number,
): Promise<void> {
  const owner = await db.prepare("SELECT telegram_user_id FROM student_post_replies WHERE id = ?").bind(replyId).first<{ telegram_user_id: string }>();
  if (!owner || owner.telegram_user_id === String(userId)) return;

  const recentReports = await db.prepare(
    "SELECT COUNT(*) AS count FROM student_post_reply_reports WHERE telegram_user_id = ? AND created_at >= datetime('now', '-1 hour')",
  ).bind(String(userId)).first<{ count: number }>();
  if (Number(recentReports?.count ?? 0) >= 30) throw new Error("rate_limited");

  const result = await db
    .prepare(
      `INSERT OR IGNORE INTO student_post_reply_reports (reply_id, telegram_user_id)
       VALUES (?, ?)`,
    )
    .bind(replyId, String(userId))
    .run();

  if (result.meta.changes > 0) {
    await db
      .prepare(
        `UPDATE student_post_replies
         SET report_count = report_count + 1,
             status = CASE WHEN report_count + 1 >= 3 THEN 'hidden' ELSE status END
         WHERE id = ?`,
      )
      .bind(replyId)
      .run();
  }
}

export async function reportStudentPost(
  db: D1Database,
  postId: number,
  userId: number,
): Promise<void> {
  const owner = await db.prepare("SELECT telegram_user_id FROM student_posts WHERE id = ?").bind(postId).first<{ telegram_user_id: string }>();
  if (!owner || owner.telegram_user_id === String(userId)) return;

  const recentReports = await db.prepare(
    "SELECT COUNT(*) AS count FROM student_post_reports WHERE telegram_user_id = ? AND created_at >= datetime('now', '-1 hour')",
  ).bind(String(userId)).first<{ count: number }>();
  if (Number(recentReports?.count ?? 0) >= 30) throw new Error("rate_limited");

  const result = await db
    .prepare(
      `INSERT OR IGNORE INTO student_post_reports (post_id, telegram_user_id)
       VALUES (?, ?)`,
    )
    .bind(postId, String(userId))
    .run();

  if (result.meta.changes > 0) {
    await db
      .prepare(
        `UPDATE student_posts
         SET report_count = report_count + 1,
             status = CASE WHEN report_count + 1 >= 3 THEN 'hidden' ELSE status END
         WHERE id = ?`,
      )
      .bind(postId)
      .run();
  }
}

export interface PersonalPulse {
  profile: StudentProfile | null;
  stats: { posts: number; replies: number; votes: number };
  recent_posts: Array<{ id: number; title: string; category: string; created_at: string; score: number }>;
  recent_replies: Array<{ id: number; post_id: number; body: string; created_at: string }>;
  matches: StudentProfile[];
}

export async function getPersonalPulse(db: D1Database, userId: number): Promise<PersonalPulse> {
  const profile = await getStudentProfile(db, userId);
  const uid = String(userId);
  const [statsRow, posts, replies, profiles] = await Promise.all([
    db.prepare(
      'SELECT (SELECT COUNT(*) FROM student_posts WHERE telegram_user_id = ? AND status = \'published\') AS posts, ' +
      '(SELECT COUNT(*) FROM student_post_replies WHERE telegram_user_id = ? AND status = \'published\') AS replies, ' +
      '(SELECT COUNT(*) FROM student_post_votes WHERE telegram_user_id = ?) + ' +
      '(SELECT COUNT(*) FROM student_post_reply_votes WHERE telegram_user_id = ?) AS votes',
    ).bind(uid, uid, uid, uid).first<{ posts: number; replies: number; votes: number }>(),
    db.prepare(
      'SELECT p.id, p.title, p.category, p.created_at, ' +
      'COALESCE((SELECT SUM(v.vote) FROM student_post_votes v WHERE v.post_id = p.id), 0) AS score ' +
      'FROM student_posts p WHERE p.telegram_user_id = ? AND p.status = \'published\' ' +
      'ORDER BY p.created_at DESC, p.id DESC LIMIT 5',
    ).bind(uid).all<{ id: number; title: string; category: string; created_at: string; score: number }>(),
    db.prepare(
      'SELECT r.id, r.post_id, r.body, r.created_at ' +
      'FROM student_post_replies r WHERE r.telegram_user_id = ? AND r.status = \'published\' ' +
      'ORDER BY r.created_at DESC, r.id DESC LIMIT 5',
    ).bind(uid).all<{ id: number; post_id: number; body: string; created_at: string }>(),
    listStudentProfiles(db, 50, userId),
  ]);

  const matches = profile
    ? profiles.filter((item) => item.public_id !== profile.public_id)
        .map((item) => ({
          item,
          score:
            (item.branch.toLowerCase() === profile.branch.toLowerCase() ? 4 : 0) +
            (item.program.toLowerCase() === profile.program.toLowerCase() ? 3 : 0) +
            (item.year === profile.year ? 2 : 0) +
            (item.looking_for.toLowerCase().includes(profile.looking_for.toLowerCase()) ||
             profile.looking_for.toLowerCase().includes(item.looking_for.toLowerCase()) ? 1 : 0),
        }))
        .sort((a, b) => b.score - a.score || a.item.display_name.localeCompare(b.item.display_name))
        .slice(0, 5)
        .map(({ item }) => item)
    : [];

  return {
    profile,
    stats: {
      posts: Number(statsRow?.posts ?? 0),
      replies: Number(statsRow?.replies ?? 0),
      votes: Number(statsRow?.votes ?? 0),
    },
    recent_posts: posts.results.map((post) => ({ ...post, score: Number(post.score ?? 0) })),
    recent_replies: replies.results,
    matches,
  };
}

export async function upsertTelegramUser(
  db: D1Database,
  user: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO users (telegram_user_id, username, first_name, last_name)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(telegram_user_id) DO UPDATE SET
         username = excluded.username,
         first_name = excluded.first_name,
         last_name = excluded.last_name,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(
      String(user.id),
      user.username ?? null,
      user.first_name ?? null,
      user.last_name ?? null,
    )
    .run();
}

export async function getOpenPoll(
  db: D1Database,
  telegramUserId?: number,
): Promise<PulsePoll | null> {
  const poll = await db
    .prepare(
      `SELECT id, question, status FROM polls
       WHERE status = 'open' ORDER BY id DESC LIMIT 1`,
    )
    .first<{ id: number; question: string; status: "open" | "closed" }>();

  if (!poll) return null;

  const options = await db
    .prepare(
      `SELECT o.id, o.label, COUNT(v.id) AS votes
       FROM poll_options o LEFT JOIN poll_votes v ON v.option_id = o.id
       WHERE o.poll_id = ?
       GROUP BY o.id, o.label, o.sort_order
       ORDER BY o.sort_order, o.id`,
    )
    .bind(poll.id)
    .all<{ id: number; label: string; votes: number }>();

  let selectedOptionId: number | null = null;
  if (telegramUserId !== undefined) {
    const selected = await db
      .prepare(
        `SELECT option_id FROM poll_votes
         WHERE poll_id = ? AND telegram_user_id = ?`,
      )
      .bind(poll.id, String(telegramUserId))
      .first<{ option_id: number }>();
    selectedOptionId = selected?.option_id ?? null;
  }

  const normalized = options.results.map((option) => ({
    id: option.id,
    label: option.label,
    votes: Number(option.votes),
  }));

  return {
    ...poll,
    options: normalized,
    total_votes: normalized.reduce((sum, option) => sum + option.votes, 0),
    selected_option_id: selectedOptionId,
  };
}

export async function voteInPoll(
  db: D1Database,
  pollId: number,
  optionId: number,
  telegramUserId: number,
): Promise<void> {
  const poll = await db.prepare("SELECT id FROM polls WHERE id=? AND status='open'").bind(pollId).first();
  if (!poll) throw new Error("poll_closed");

  const validOption = await db
    .prepare(`SELECT 1 FROM poll_options WHERE id = ? AND poll_id = ?`)
    .bind(optionId, pollId)
    .first();

  if (!validOption) throw new Error("invalid_option");

  await db
    .prepare(
      `INSERT INTO poll_votes (poll_id, option_id, telegram_user_id)
       VALUES (?, ?, ?)
       ON CONFLICT(poll_id, telegram_user_id) DO UPDATE SET option_id = excluded.option_id`,
    )
    .bind(pollId, optionId, String(telegramUserId))
    .run();
}
