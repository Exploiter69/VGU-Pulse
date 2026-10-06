export interface PulsePoll {
  id: number;
  question: string;
  status: "open" | "closed";
  options: Array<{ id: number; label: string; votes: number }>;
  total_votes: number;
  selected_option_id: number | null;
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
