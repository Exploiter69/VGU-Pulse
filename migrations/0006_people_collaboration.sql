CREATE TABLE IF NOT EXISTS student_profile_blocks (
  blocker_telegram_user_id TEXT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  blocked_telegram_user_id TEXT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (blocker_telegram_user_id, blocked_telegram_user_id),
  CHECK (blocker_telegram_user_id <> blocked_telegram_user_id)
);

CREATE INDEX IF NOT EXISTS idx_student_profile_blocks_blocked
  ON student_profile_blocks(blocked_telegram_user_id);
