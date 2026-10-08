-- Gate 1 hardening: community privacy, notification routing, report dedupe, retry state.
ALTER TABLE student_profile_blocks ADD COLUMN via_anonymous INTEGER NOT NULL DEFAULT 0 CHECK (via_anonymous IN (0, 1));
ALTER TABLE student_profile_blocks ADD COLUMN source_item_id INTEGER REFERENCES community_items(id) ON DELETE SET NULL;

ALTER TABLE student_notifications ADD COLUMN channel TEXT NOT NULL DEFAULT 'official'
  CHECK (channel IN ('official','community_replies','community_activity','personalized'));

ALTER TABLE student_notifications ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE student_notifications ADD COLUMN last_error TEXT;
ALTER TABLE student_notifications ADD COLUMN failed_at TEXT;

UPDATE student_notifications
SET channel = CASE
  WHEN reference_key LIKE 'v2-reply:%' THEN 'community_activity'
  WHEN reference_key LIKE 'v2-personal:%' THEN 'personalized'
  WHEN reference_key LIKE 'reply:%' THEN 'community_replies'
  WHEN reference_key LIKE 'official:%' THEN 'official'
  WHEN kind = 'official' THEN 'official'
  ELSE 'community_activity'
END
WHERE channel = 'official';

CREATE TABLE IF NOT EXISTS community_reply_reports (
  reply_id INTEGER NOT NULL REFERENCES community_replies(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT 'other',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (reply_id, telegram_user_id)
);

CREATE INDEX IF NOT EXISTS idx_reply_reports_user_time
  ON community_reply_reports(telegram_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_reports_user_time
  ON community_reports(telegram_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_pending
  ON student_notifications(sent_at, failed_at, created_at, id);
