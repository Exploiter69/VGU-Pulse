-- Gate 3 reliability completion. Never modify 0001-0013.
ALTER TABLE student_notifications ADD COLUMN retry_at TEXT;

CREATE TABLE IF NOT EXISTS moderation_report_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_telegram_user_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK(target_type IN ('item','reply','profile')),
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'other',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_moderation_report_history_target
  ON moderation_report_history(target_type,target_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_report_history_reporter
  ON moderation_report_history(reporter_telegram_user_id,created_at DESC);

CREATE TABLE user_bans_new (
  telegram_user_id TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  banned_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT
);
INSERT OR IGNORE INTO user_bans_new(telegram_user_id,reason,banned_by,created_at,expires_at)
SELECT telegram_user_id,reason,banned_by,created_at,expires_at FROM user_bans;
DROP TABLE user_bans;
ALTER TABLE user_bans_new RENAME TO user_bans;
CREATE INDEX IF NOT EXISTS idx_user_bans_active ON user_bans(expires_at);
