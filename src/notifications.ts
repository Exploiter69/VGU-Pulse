import { telegramApi } from "./telegram-bot";

export interface NotificationPreferences {
  official_updates: boolean;
  community_replies: boolean;
  enabled_at: string;
}

export interface StudentNotification {
  id: number;
  kind: "official" | "community";
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
  sent_at: string | null;
}

function clampText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function getNotificationPreferences(
  db: D1Database,
  userId: number,
): Promise<NotificationPreferences> {
  await db.prepare(
    `INSERT OR IGNORE INTO notification_preferences (telegram_user_id)
     VALUES (?)`,
  ).bind(String(userId)).run();
  const row = await db.prepare(
    `SELECT official_updates, community_replies, enabled_at
     FROM notification_preferences WHERE telegram_user_id = ?`,
  ).bind(String(userId)).first<{ official_updates: number; community_replies: number; enabled_at: string }>();
  return {
    official_updates: Boolean(row?.official_updates),
    community_replies: Boolean(row?.community_replies),
    enabled_at: row?.enabled_at ?? new Date().toISOString(),
  };
}

export async function setNotificationPreferences(
  db: D1Database,
  userId: number,
  input: { official_updates?: boolean; community_replies?: boolean },
): Promise<NotificationPreferences> {
  const current = await getNotificationPreferences(db, userId);
  const official = input.official_updates ?? current.official_updates;
  const community = input.community_replies ?? current.community_replies;
  const justEnabledOfficial = official && !current.official_updates;
  if (justEnabledOfficial) {
    await db.prepare(
      `UPDATE notification_preferences
       SET official_updates = ?, community_replies = ?, enabled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE telegram_user_id = ?`,
    ).bind(1, community ? 1 : 0, String(userId)).run();
  } else {
    await db.prepare(
      `UPDATE notification_preferences
       SET official_updates = ?, community_replies = ?, updated_at = CURRENT_TIMESTAMP
       WHERE telegram_user_id = ?`,
    ).bind(official ? 1 : 0, community ? 1 : 0, String(userId)).run();
  }
  return { ...current, official_updates: official, community_replies: community };
}

export async function listStudentNotifications(
  db: D1Database,
  userId: number,
  limit = 20,
): Promise<StudentNotification[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
  const result = await db.prepare(
    `SELECT id, kind, title, body, created_at, read_at, sent_at
     FROM student_notifications
     WHERE telegram_user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
  ).bind(String(userId), safeLimit).all<StudentNotification>();
  return result.results ?? [];
}

export async function markStudentNotificationsRead(db: D1Database, userId: number): Promise<void> {
  await db.prepare(
    `UPDATE student_notifications
     SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
     WHERE telegram_user_id = ? AND read_at IS NULL`,
  ).bind(String(userId)).run();
}

export async function createCommunityReplyNotification(
  db: D1Database,
  postId: number,
  replyId: number,
  authorId: number,
  replyBody: string,
): Promise<void> {
  const post = await db.prepare(
    `SELECT telegram_user_id, title FROM student_posts
     WHERE id = ? AND status = 'published'`,
  ).bind(postId).first<{ telegram_user_id: string; title: string }>();
  if (!post || post.telegram_user_id === String(authorId)) return;

  const prefs = await db.prepare(
    `SELECT community_replies FROM notification_preferences
     WHERE telegram_user_id = ?`,
  ).bind(post.telegram_user_id).first<{ community_replies: number }>();
  if (!prefs?.community_replies) return;

  const title = "New reply to your post";
  const body = `Someone replied to “${clampText(post.title, 120)}”: ${clampText(replyBody, 500)}`;
  await db.prepare(
    `INSERT OR IGNORE INTO student_notifications
     (telegram_user_id, kind, title, body, reference_key)
     VALUES (?, 'community', ?, ?, ?)`,
  ).bind(post.telegram_user_id, title, body, `reply:${replyId}`).run();
}

async function queueOfficialNotifications(
  db: D1Database,
  signalService: Fetcher,
): Promise<number> {
  let response: Response;
  try {
    response = await signalService.fetch(
      new Request("https://vgu-signal-worker/public/information?limit=10", {
        headers: { accept: "application/json" },
      }),
    );
  } catch {
    return 0;
  }
  if (!response.ok) return 0;

  const payload = await response.json() as {
    items?: Array<Record<string, unknown>>;
    sections?: Array<{ items?: Array<Record<string, unknown>> }>;
  };
  const items = payload.items ??
    payload.sections?.flatMap((section) => section.items ?? []) ?? [];
  let queued = 0;

  for (const item of items.slice(0, 10)) {
    const title = clampText(item.title, 180) || "New verified VGU information";
    const summary = clampText(item.summary, 650);
    const source = clampText(item.primary_source_url, 500);
    const dateValue = clampText(item.published_at || item.created_at, 80);
    const timestamp = Date.parse(dateValue);
    const reference = clampText(item.id, 160) || source || title;
    if (!Number.isFinite(timestamp)) continue;

    const result = await db.prepare(
      `INSERT OR IGNORE INTO student_notifications
       (telegram_user_id, kind, title, body, reference_key)
       SELECT telegram_user_id, 'official', ?, ?, ?
       FROM notification_preferences
       WHERE official_updates = 1 AND datetime(enabled_at) <= datetime(?)`,
    ).bind(
      title,
      summary || "A new verified VGU information item is available in Pulse.",
      `official:${reference}`,
      new Date(timestamp).toISOString(),
    ).run();
    queued += Number(result.meta.changes ?? 0);
  }
  return queued;
}

export async function runNotificationSweep(
  db: D1Database,
  signalService: Fetcher,
  botToken: string,
  webAppUrl?: string,
): Promise<{ queued: number; sent: number; failed: number }> {
  if (!botToken) return { queued: 0, sent: 0, failed: 0 };
  const queued = await queueOfficialNotifications(db, signalService);
  await db.prepare(
    `DELETE FROM student_notifications
     WHERE sent_at IS NULL
       AND (
         (kind = 'official' AND NOT EXISTS (
           SELECT 1 FROM notification_preferences p
           WHERE p.telegram_user_id = student_notifications.telegram_user_id
             AND p.official_updates = 1
         ))
         OR
         (kind = 'community' AND NOT EXISTS (
           SELECT 1 FROM notification_preferences p
           WHERE p.telegram_user_id = student_notifications.telegram_user_id
             AND p.community_replies = 1
         ))
       )`,
  ).run();

  const pending = await db.prepare(
    `SELECT n.id, n.telegram_user_id, n.title, n.body
     FROM student_notifications n
     JOIN notification_preferences p
       ON p.telegram_user_id = n.telegram_user_id
     WHERE n.sent_at IS NULL
       AND ((n.kind = 'official' AND p.official_updates = 1)
         OR (n.kind = 'community' AND p.community_replies = 1))
     ORDER BY n.created_at DESC, n.id DESC
     LIMIT 18`,
  ).all<{ id: number; telegram_user_id: string; title: string; body: string }>();

  let sent = 0;
  let failed = 0;
  for (const notification of pending.results ?? []) {
    const chatId = Number(notification.telegram_user_id);
    if (!Number.isSafeInteger(chatId)) {
      failed++;
      continue;
    }
    const reply_markup = webAppUrl
      ? { inline_keyboard: [[{ text: "Open VGU Pulse", web_app: { url: webAppUrl } }]] }
      : undefined;
    try {
      const response = await telegramApi(botToken, "sendMessage", {
        chat_id: chatId,
        text: `<b>${notification.title.replace(/[<>&]/g, "")}</b>\n\n${notification.body.replace(/[<>&]/g, "")}`,
        parse_mode: "HTML",
        reply_markup,
      });
      if (!response.ok) {
        failed++;
        continue;
      }
      await db.prepare(
        `UPDATE student_notifications SET sent_at = CURRENT_TIMESTAMP WHERE id = ?`,
      ).bind(notification.id).run();
      sent++;
    } catch {
      failed++;
    }
  }
  return { queued, sent, failed };
}
