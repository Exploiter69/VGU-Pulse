-- Gate 2/4 privacy correction. Never modify prior migrations.
-- Bans are moderation history and must survive account deletion.
PRAGMA foreign_keys=OFF;
CREATE TABLE IF NOT EXISTS user_bans_persistent (
  telegram_user_id TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  banned_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT
);
INSERT OR IGNORE INTO user_bans_persistent(telegram_user_id,reason,banned_by,created_at,expires_at)
  SELECT telegram_user_id,reason,banned_by,created_at,expires_at FROM user_bans;
DROP TABLE user_bans;
ALTER TABLE user_bans_persistent RENAME TO user_bans;
CREATE INDEX IF NOT EXISTS idx_user_bans_active ON user_bans(expires_at);
PRAGMA foreign_keys=ON;
