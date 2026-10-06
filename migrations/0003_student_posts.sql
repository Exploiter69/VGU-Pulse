CREATE TABLE IF NOT EXISTS student_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_user_id TEXT NOT NULL REFERENCES users(telegram_user_id),
  category TEXT NOT NULL CHECK (category IN ('question', 'info', 'opportunity', 'request')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
  report_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_posts_feed
  ON student_posts(status, created_at DESC);

CREATE TABLE IF NOT EXISTS student_post_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES student_posts(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, telegram_user_id)
);

CREATE INDEX IF NOT EXISTS idx_student_post_reports_post_id
  ON student_post_reports(post_id);
