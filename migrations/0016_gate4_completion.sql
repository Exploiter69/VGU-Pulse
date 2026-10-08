-- Gate 4 completion: resource reports, event reminders and growth settings.
CREATE TABLE IF NOT EXISTS resource_reports (
  resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT 'other',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(resource_id,telegram_user_id)
);
CREATE TABLE IF NOT EXISTS event_reminders (
  event_id INTEGER NOT NULL REFERENCES campus_events(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL REFERENCES users(telegram_user_id) ON DELETE CASCADE,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(event_id,telegram_user_id)
);
CREATE INDEX IF NOT EXISTS idx_event_reminders_enabled ON event_reminders(enabled,event_id);
