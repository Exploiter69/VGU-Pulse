-- Gate 4 student features. Never modify prior migrations.
CREATE TABLE IF NOT EXISTS mess_daily_ratings (
  day TEXT NOT NULL,
  telegram_user_id TEXT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  meal TEXT NOT NULL DEFAULT 'overall' CHECK(meal IN ('overall','breakfast','lunch','dinner')),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(day,telegram_user_id,meal)
);
CREATE TABLE IF NOT EXISTS campus_questions (
  day TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS exam_countdowns (
  telegram_user_id TEXT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  exam_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(telegram_user_id,title)
);

CREATE TABLE IF NOT EXISTS resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_user_id TEXT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  file_id TEXT NOT NULL,
  file_unique_id TEXT,
  name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  subject TEXT,
  semester TEXT,
  resource_type TEXT NOT NULL CHECK(resource_type IN ('PYQ','notes','assignment','other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published','hidden','review')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_resources_lookup ON resources(status,subject,semester,resource_type,created_at DESC);

CREATE TABLE IF NOT EXISTS campus_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  location TEXT,
  community_slug TEXT,
  created_by TEXT NOT NULL,
  official INTEGER NOT NULL DEFAULT 0 CHECK(official IN (0,1)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published','cancelled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS event_rsvps (
  event_id INTEGER NOT NULL REFERENCES campus_events(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  interested INTEGER NOT NULL DEFAULT 1 CHECK(interested IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(event_id,telegram_user_id)
);

CREATE TABLE IF NOT EXISTS expiring_listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_user_id TEXT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('lost_found','ride','roommate')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  resolved_at TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('published','resolved','expired','hidden')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_expiring_listings ON expiring_listings(kind,status,expires_at,created_at DESC);

CREATE TABLE IF NOT EXISTS teacher_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_user_id TEXT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  teacher TEXT NOT NULL,
  elective TEXT NOT NULL,
  teaching INTEGER NOT NULL CHECK(teaching BETWEEN 1 AND 5),
  workload INTEGER NOT NULL CHECK(workload BETWEEN 1 AND 5),
  support INTEGER NOT NULL CHECK(support BETWEEN 1 AND 5),
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published','hidden','review')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_teacher_reviews_aggregate ON teacher_reviews(teacher,elective,status);
