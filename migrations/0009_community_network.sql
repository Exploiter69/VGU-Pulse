-- VGU Pulse V2 community network
-- Adds a unified student-community layer without changing the existing V1 tables.

ALTER TABLE notification_preferences ADD COLUMN community_activity INTEGER NOT NULL DEFAULT 0 CHECK (community_activity IN (0, 1));
ALTER TABLE notification_preferences ADD COLUMN personalized_alerts INTEGER NOT NULL DEFAULT 0 CHECK (personalized_alerts IN (0, 1));

CREATE TABLE IF NOT EXISTS community_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_user_id TEXT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN (
    'discussion','confession','campus','exam','senior','utility','listing',
    'lost_found','notes','pyq','teammate','ride','roommate','teacher','elective','opportunity'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  community_slug TEXT NOT NULL DEFAULT 'campus',
  audience_program TEXT,
  audience_branch TEXT,
  audience_year INTEGER CHECK (audience_year IS NULL OR audience_year BETWEEN 1 AND 6),
  anonymous INTEGER NOT NULL DEFAULT 0 CHECK (anonymous IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published','hidden','review')),
  report_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_community_feed ON community_items(status, community_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_kind ON community_items(status, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_audience ON community_items(status, audience_branch, audience_year, created_at DESC);

CREATE TABLE IF NOT EXISTS community_replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES community_items(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  anonymous INTEGER NOT NULL DEFAULT 0 CHECK (anonymous IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published','hidden','review')),
  report_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_community_replies ON community_replies(item_id, status, created_at ASC);

CREATE TABLE IF NOT EXISTS community_votes (
  item_id INTEGER NOT NULL REFERENCES community_items(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  vote INTEGER NOT NULL CHECK (vote IN (-1, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (item_id, telegram_user_id)
);

CREATE TABLE IF NOT EXISTS community_follows (
  item_id INTEGER NOT NULL REFERENCES community_items(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (item_id, telegram_user_id)
);

CREATE TABLE IF NOT EXISTS community_saves (
  item_id INTEGER NOT NULL REFERENCES community_items(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (item_id, telegram_user_id)
);

CREATE TABLE IF NOT EXISTS community_reports (
  item_id INTEGER NOT NULL REFERENCES community_items(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT 'other',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (item_id, telegram_user_id)
);

CREATE TABLE IF NOT EXISTS community_poll_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES community_items(id) ON DELETE CASCADE,
  label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS community_poll_votes (
  item_id INTEGER NOT NULL REFERENCES community_items(id) ON DELETE CASCADE,
  option_id INTEGER NOT NULL REFERENCES community_poll_options(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (item_id, telegram_user_id)
);

CREATE TABLE IF NOT EXISTS community_reputation (
  telegram_user_id TEXT PRIMARY KEY REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_reputation_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_user_id TEXT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_key TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reputation_events_user ON community_reputation_events(telegram_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS community_badges (
  telegram_user_id TEXT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  badge TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (telegram_user_id, badge)
);
