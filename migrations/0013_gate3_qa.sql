-- Gate 3 Q&A and contact completion. Never modify prior migrations.
ALTER TABLE community_items ADD COLUMN solved INTEGER NOT NULL DEFAULT 0 CHECK(solved IN (0,1));
ALTER TABLE community_items ADD COLUMN accepted_reply_id INTEGER REFERENCES community_replies(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS community_reply_votes (
  reply_id INTEGER NOT NULL REFERENCES community_replies(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  vote INTEGER NOT NULL CHECK(vote IN (-1,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(reply_id,telegram_user_id)
);

CREATE TABLE IF NOT EXISTS community_item_reads (
  item_id INTEGER NOT NULL REFERENCES community_items(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  last_read_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(item_id,telegram_user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_reply_votes_user ON community_reply_votes(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_community_item_reads_user ON community_item_reads(telegram_user_id,last_read_at DESC);
