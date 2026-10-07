CREATE TABLE IF NOT EXISTS student_post_votes (
  post_id INTEGER NOT NULL REFERENCES student_posts(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  vote INTEGER NOT NULL CHECK (vote IN (-1, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, telegram_user_id)
);

CREATE INDEX IF NOT EXISTS idx_student_post_votes_post
  ON student_post_votes(post_id);

CREATE TABLE IF NOT EXISTS student_post_reply_votes (
  reply_id INTEGER NOT NULL REFERENCES student_post_replies(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  vote INTEGER NOT NULL CHECK (vote IN (-1, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (reply_id, telegram_user_id)
);

CREATE INDEX IF NOT EXISTS idx_student_post_reply_votes_reply
  ON student_post_reply_votes(reply_id);
