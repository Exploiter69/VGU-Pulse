CREATE TABLE IF NOT EXISTS notification_preferences (
  telegram_user_id TEXT PRIMARY KEY REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  official_updates INTEGER NOT NULL DEFAULT 0 CHECK (official_updates IN (0, 1)),
  community_replies INTEGER NOT NULL DEFAULT 0 CHECK (community_replies IN (0, 1)),
  enabled_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_user_id TEXT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('official', 'community')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  reference_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at TEXT,
  sent_at TEXT,
  UNIQUE(telegram_user_id, kind, reference_key)
);

CREATE INDEX IF NOT EXISTS idx_student_notifications_pending
  ON student_notifications(telegram_user_id, sent_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_notifications_read
  ON student_notifications(telegram_user_id, read_at, created_at DESC);
