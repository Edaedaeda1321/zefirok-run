-- Achievements V10: persistent showcase shelf style.
-- Style unlock conditions remain server-authoritative in src/worker.js.

CREATE TABLE IF NOT EXISTS achievement_showcase_preferences (
  telegram_id TEXT PRIMARY KEY,
  style_id TEXT NOT NULL DEFAULT 'default',
  updated_at INTEGER NOT NULL DEFAULT 0
);
