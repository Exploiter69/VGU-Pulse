-- Gate 3 search correctness. Never modify prior migrations.
INSERT INTO community_items_fts(rowid,title,body)
SELECT i.id,i.title,i.body
FROM community_items i
WHERE NOT EXISTS (SELECT 1 FROM community_items_fts f WHERE f.rowid=i.id);
