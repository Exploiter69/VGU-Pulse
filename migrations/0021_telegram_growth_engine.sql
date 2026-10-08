-- Phase 2 Telegram growth engine delivery log and bounded candidate view.
CREATE TABLE IF NOT EXISTS telegram_channel_cards (
  card_key TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  entity_id INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_telegram_channel_cards_created ON telegram_channel_cards(created_at);

DROP VIEW IF EXISTS telegram_channel_candidates;
CREATE VIEW telegram_channel_candidates AS
SELECT 'poll' AS kind,p.id AS entity_id,p.question AS title,p.created_at AS detail
FROM polls p
WHERE p.status='open' AND (p.closes_at IS NULL OR p.closes_at>CURRENT_TIMESTAMP)
  AND p.created_at>=datetime('now','-2 days')
UNION ALL
SELECT 'event',e.id,e.title,e.starts_at
FROM campus_events e
WHERE e.status='published' AND e.starts_at>CURRENT_TIMESTAMP AND e.starts_at<=datetime('now','+24 hours')
UNION ALL
SELECT 'mess',0,'Mess average '||ROUND(AVG(rating),1)||'/5',MAX(day)
FROM mess_daily_ratings
WHERE day=date('now')
HAVING COUNT(*)>=5
UNION ALL
SELECT 'thread',i.id,i.title,i.created_at
FROM community_items i
WHERE i.status='published'
  AND i.kind IN ('exam','notes','question','discussion')
  AND i.created_at>=datetime('now','-24 hours')
ORDER BY CASE kind WHEN 'poll' THEN 0 WHEN 'event' THEN 1 WHEN 'mess' THEN 2 ELSE 3 END,detail DESC
LIMIT 8;
