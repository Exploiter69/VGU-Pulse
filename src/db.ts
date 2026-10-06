export interface StudentPost {
  id: number;
  category: "question" | "info" | "opportunity" | "request";
  title: string;
  body: string;
  author_name: string;
  created_at: string;
  report_count: number;
}

export interface StudentReply {
  id: number;
  post_id: number;
  body: string;
  author_name: string;
  created_at: string;
  report_count: number;
}


export interface StudentProfile {
  public_id: string;
  telegram_user_id: string;
  display_name: string;
  program: string;
  branch: string;
  year: number;
  bio: string;
  looking_for: string;
  updated_at: string;
}

export function validateStudentProfileInput(input: {
  display_name?: unknown; program?: unknown; branch?: unknown; year?: unknown;
  bio?: unknown; looking_for?: unknown;
}): Omit<StudentProfile, "public_id" | "telegram_user_id" | "updated_at"> | null {
  if (typeof input.display_name !== "string" || typeof input.program !== "string" ||
      typeof input.branch !== "string" || typeof input.year !== "number" ||
      typeof input.bio !== "string" || typeof input.looking_for !== "string") return null;
  const display_name = input.display_name.trim();
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
    `SELECT public_id, telegram_user_id, display_name, program, branch, year, bio, looking_for, updated_at
     FROM student_profiles WHERE telegram_user_id = ?`,
  ).bind(String(userId)).first<StudentProfile>();
  if (!profile) throw new Error("profile_save_failed");
  return profile;
}

export async function getStudentProfile(db: D1Database, userId: number): Promise<StudentProfile | null> {
  return db.prepare(
    `SELECT public_id, telegram_user_id, display_name, program, branch, year, bio, looking_for, updated_at
     FROM student_profiles WHERE telegram_user_id = ?`,
  ).bind(String(userId)).first<StudentProfile>();
}

export async function listStudentProfiles(db: D1Database, limit = 30): Promise<StudentProfile[]> {
  const rows = await db.prepare(
    `SELECT public_id, telegram_user_id, display_name, program, branch, year, bio, looking_for, updated_at
     FROM student_profiles WHERE status = 'published' AND report_count < 3
     ORDER BY updated_at DESC, telegram_user_id LIMIT ?`,
  ).bind(Math.min(Math.max(limit, 1), 50)).all<StudentProfile>();
  return rows.results;
}

export async function reportStudentProfile(db: D1Database, profilePublicId: string, reporterUserId: number): Promise<void> {
  const result = await db.prepare(
    `INSERT OR IGNORE INTO student_profile_reports (profile_user_id, reporter_telegram_user_id)
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
              p.created_at, p.report_count
       FROM student_posts p
       JOIN users u ON u.telegram_user_id = p.telegram_user_id
       WHERE p.id = ?`,
    )
    .bind(result.meta.last_row_id)
    .first<StudentPost>();
  if (!post) throw new Error("post_create_failed");
  return { ...post, report_count: Number(post.report_count) };
}

export async function listStudentPosts(
  db: D1Database,
  limit = 20,
  category?: StudentPost["category"],
): Promise<StudentPost[]> {
  const rows = await db
    .prepare(
      `SELECT p.id, p.category, p.title, p.body,
              COALESCE(NULLIF(TRIM(u.first_name || ' ' || COALESCE(u.last_name, '')), ''), 'VGU student') AS author_name,
              p.created_at, p.report_count
       FROM student_posts p
       JOIN users u ON u.telegram_user_id = p.telegram_user_id
       WHERE p.status = 'published' AND p.report_count < 3
         AND (? IS NULL OR p.category = ?)
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT ?`,
    )
    .bind(category ?? null, category ?? null, Math.min(Math.max(limit, 1), 50))
    .all<StudentPost>();
  return rows.results.map((post) => ({
    ...post,
    report_count: Number(post.report_count),
  }));
}

export async function listStudentReplies(
  db: D1Database,
  postId: number,
  limit = 50,
): Promise<StudentReply[]> {
  const rows = await db
    .prepare(
      `SELECT r.id, r.post_id, r.body,
              COALESCE(NULLIF(TRIM(u.first_name || ' ' || COALESCE(u.last_name, '')), ''), 'VGU student') AS author_name,
              r.created_at, r.report_count
       FROM student_post_replies r
       JOIN users u ON u.telegram_user_id = r.telegram_user_id
       WHERE r.post_id = ? AND r.status = 'published' AND r.report_count < 3
       ORDER BY r.created_at ASC, r.id ASC
       LIMIT ?`,
    )
    .bind(postId, Math.min(Math.max(limit, 1), 50))
    .all<StudentReply>();
  return rows.results.map((reply) => ({
    ...reply,
    report_count: Number(reply.report_count),
  }));
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
  return { ...reply, report_count: Number(reply.report_count) };
}

export async function reportStudentReply(
  db: D1Database,
  replyId: number,
  userId: number,
): Promise<void> {
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
