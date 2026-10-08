-- VGU Pulse V1 -> V2 bridge. Run locally only after 0012.
INSERT OR IGNORE INTO community_items
  (telegram_user_id,kind,title,body,community_slug,audience_program,audience_branch,audience_year,anonymous,status,report_count,created_at,updated_at,legacy_v1_post_id)
SELECT telegram_user_id,
  CASE category WHEN 'question' THEN 'discussion' WHEN 'info' THEN 'campus' WHEN 'opportunity' THEN 'opportunity' ELSE 'request' END,
  title,body,'campus',NULL,NULL,NULL,0,status,report_count,created_at,created_at,id
FROM student_posts
WHERE NOT EXISTS (SELECT 1 FROM community_items v WHERE v.legacy_v1_post_id=student_posts.id);

INSERT OR IGNORE INTO community_replies
  (item_id,telegram_user_id,body,anonymous,status,report_count,created_at,legacy_v1_reply_id)
SELECT v.id,r.telegram_user_id,r.body,0,r.status,r.report_count,r.created_at,r.id
FROM student_post_replies r
JOIN community_items v ON v.legacy_v1_post_id=r.post_id
WHERE NOT EXISTS (SELECT 1 FROM community_replies vr WHERE vr.legacy_v1_reply_id=r.id);

INSERT OR IGNORE INTO community_votes(item_id,telegram_user_id,vote,created_at)
SELECT v.id,x.telegram_user_id,x.vote,x.created_at
FROM student_post_votes x
JOIN community_items v ON v.legacy_v1_post_id=x.post_id;

INSERT OR IGNORE INTO community_votes(item_id,telegram_user_id,vote,created_at)
SELECT vr.item_id,x.telegram_user_id,x.vote,x.created_at
FROM student_post_reply_votes x
JOIN community_replies vr ON vr.legacy_v1_reply_id=x.reply_id;
