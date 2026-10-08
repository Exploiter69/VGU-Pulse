-- Gate 4 moderation-history continuity. Never modify prior migrations.
ALTER TABLE moderation_report_history ADD COLUMN target_telegram_user_id TEXT;

UPDATE moderation_report_history
SET target_telegram_user_id = (
  SELECT i.telegram_user_id FROM community_items i WHERE moderation_report_history.target_type='item' AND i.id=CAST(moderation_report_history.target_id AS INTEGER)
)
WHERE target_type='item' AND target_telegram_user_id IS NULL;

UPDATE moderation_report_history
SET target_telegram_user_id = (
  SELECT r.telegram_user_id FROM community_replies r WHERE moderation_report_history.target_type='reply' AND r.id=CAST(moderation_report_history.target_id AS INTEGER)
)
WHERE target_type='reply' AND target_telegram_user_id IS NULL;

UPDATE moderation_report_history
SET target_telegram_user_id = (
  SELECT p.telegram_user_id FROM student_profiles p WHERE moderation_report_history.target_type='profile' AND p.public_id=moderation_report_history.target_id
)
WHERE target_type='profile' AND target_telegram_user_id IS NULL;

INSERT INTO moderation_report_history
  (reporter_telegram_user_id,target_type,target_id,reason,created_at,target_telegram_user_id)
SELECT r.reporter_telegram_user_id,'profile',p.public_id,'other',r.created_at,p.telegram_user_id
FROM student_profile_reports r
JOIN student_profiles p ON p.telegram_user_id=r.profile_user_id;

CREATE INDEX IF NOT EXISTS idx_moderation_report_history_target_user
  ON moderation_report_history(target_telegram_user_id,created_at DESC);
