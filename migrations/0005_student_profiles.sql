CREATE TABLE IF NOT EXISTS student_profiles (
  public_id TEXT NOT NULL UNIQUE,
  telegram_user_id TEXT PRIMARY KEY REFERENCES users(telegram_user_id),
  display_name TEXT NOT NULL,
  program TEXT NOT NULL,
  branch TEXT NOT NULL,
  year INTEGER NOT NULL CHECK (year BETWEEN 1 AND 6),
  bio TEXT NOT NULL DEFAULT '',
  looking_for TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
  report_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_profiles_feed
  ON student_profiles(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS student_profile_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_public_id TEXT NOT NULL REFERENCES student_profiles(public_id) ON DELETE CASCADE,
  reporter_telegram_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(profile_public_id, reporter_telegram_user_id)
);

CREATE INDEX IF NOT EXISTS idx_student_profile_reports_profile
  ON student_profile_reports(profile_public_id);
