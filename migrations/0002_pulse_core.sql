CREATE TABLE IF NOT EXISTS polls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closes_at TEXT
);

CREATE TABLE IF NOT EXISTS poll_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id INTEGER NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(poll_id, telegram_user_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes(poll_id);

INSERT INTO polls (question, status)
SELECT 'What should VGU Pulse help students with first?', 'open'
WHERE NOT EXISTS (SELECT 1 FROM polls);

INSERT INTO poll_options (poll_id, label, sort_order)
SELECT p.id, 'Important notices & deadlines', 1 FROM polls p
WHERE p.question = 'What should VGU Pulse help students with first?'
AND NOT EXISTS (SELECT 1 FROM poll_options WHERE poll_id = p.id);

INSERT INTO poll_options (poll_id, label, sort_order)
SELECT p.id, 'Events, clubs & opportunities', 2 FROM polls p
WHERE p.question = 'What should VGU Pulse help students with first?'
AND NOT EXISTS (SELECT 1 FROM poll_options WHERE poll_id = p.id AND label = 'Events, clubs & opportunities');

INSERT INTO poll_options (poll_id, label, sort_order)
SELECT p.id, 'Mess, campus services & daily life', 3 FROM polls p
WHERE p.question = 'What should VGU Pulse help students with first?'
AND NOT EXISTS (SELECT 1 FROM poll_options WHERE poll_id = p.id AND label = 'Mess, campus services & daily life');

INSERT INTO poll_options (poll_id, label, sort_order)
SELECT p.id, 'Find people, teams & study groups', 4 FROM polls p
WHERE p.question = 'What should VGU Pulse help students with first?'
AND NOT EXISTS (SELECT 1 FROM poll_options WHERE poll_id = p.id AND label = 'Find people, teams & study groups');
