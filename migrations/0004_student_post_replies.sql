CREATE TABLE IF NOT EXISTS student_post_replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES student_posts(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL REFERENCES users(telegram_user_id),
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
  report_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_post_replies_feed
  ON student_post_replies(post_id, status, created_at ASC);

CREATE TABLE IF NOT EXISTS student_post_reply_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reply_id INTEGER NOT NULL REFERENCES student_post_replies(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(reply_id, telegram_user_id)
);

CREATE INDEX IF NOT EXISTS idx_student_post_reply_reports_reply_id
  ON student_post_reply_reports(reply_id);
