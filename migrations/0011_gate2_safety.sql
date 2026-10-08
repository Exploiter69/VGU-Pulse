-- Gate 2 privacy, moderation and account controls. Never modify 0001-0010.
CREATE TABLE IF NOT EXISTS community_anonymous_notices (
  telegram_user_id TEXT PRIMARY KEY REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  acknowledged_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_rules_ack (
  telegram_user_id TEXT PRIMARY KEY REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  acknowledged_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS moderation_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_telegram_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_target ON moderation_actions(target_type,target_id,created_at DESC);

CREATE TABLE IF NOT EXISTS user_bans (
  telegram_user_id TEXT PRIMARY KEY REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  banned_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT
);

CREATE TABLE IF NOT EXISTS moderation_report_weights (
  telegram_user_id TEXT PRIMARY KEY REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  weight REAL NOT NULL DEFAULT 1 CHECK(weight>=0.25 AND weight<=5),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_bans_active ON user_bans(expires_at);
CREATE INDEX IF NOT EXISTS idx_community_items_review ON community_items(status,report_count,created_at);
CREATE INDEX IF NOT EXISTS idx_community_replies_review ON community_replies(status,report_count,created_at);
