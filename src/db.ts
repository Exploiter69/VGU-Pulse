export interface StudentPost {
  id: number;
  category: "question" | "info" | "opportunity" | "request";
  title: string;
  body: string;
  author_name: string;
  created_at: string;
  report_count: number;
}

export interface PulsePoll {
  id: number;
  question: string;
  status: "open" | "closed";
  options: Array<{ id: number; label: string; votes: number }>;
  total_votes: number;
  selected_option_id: number | null;
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
      `SELECT id, category, title, body, author_name, created_at, report_count
       FROM student_posts WHERE id = ?`,
    )
    .bind(result.meta.last_row_id)
    .first<StudentPost>();
  if (!post) throw new Error("post_create_failed");
  return { ...post, report_count: Number(post.report_count) };
}

export async function listStudentPosts(
  db: D1Database,
  limit = 20,
): Promise<StudentPost[]> {
  const rows = await db
    .prepare(
      `SELECT p.id, p.category, p.title, p.body,
              COALESCE(NULLIF(TRIM(u.first_name || ' ' || COALESCE(u.last_name, '')), ''), 'VGU student') AS author_name,
              p.created_at, p.report_count
       FROM student_posts p
       JOIN users u ON u.telegram_user_id = p.telegram_user_id
       WHERE p.status = 'published' AND p.report_count < 3
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT ?`,
    )
    .bind(Math.min(Math.max(limit, 1), 50))
    .all<StudentPost>();
  return rows.results.map((post) => ({
    ...post,
    report_count: Number(post.report_count),
  }));
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
