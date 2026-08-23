CREATE TABLE IF NOT EXISTS skin_prices (
  skin_id TEXT PRIMARY KEY,
  points INTEGER NOT NULL DEFAULT 0 CHECK(points >= 0),
  treats INTEGER NOT NULL DEFAULT 0 CHECK(treats >= 0),
  coffee INTEGER NOT NULL DEFAULT 0 CHECK(coffee >= 0),
  version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);

INSERT OR IGNORE INTO skin_prices (
  skin_id, points, treats, coffee, version, updated_at, updated_by
) VALUES
  ('default', 0, 0, 0, 1, unixepoch(), 'migration'),
  ('barista', 150000, 0, 700, 1, unixepoch(), 'migration'),
  ('strawberry', 300000, 700, 0, 1, unixepoch(), 'migration'),
  ('bee', 600000, 900, 0, 1, unixepoch(), 'migration'),
  ('sailor', 1200000, 0, 900, 1, unixepoch(), 'migration'),
  ('princess', 2400000, 1100, 1100, 1, unixepoch(), 'migration'),
  ('angel', 4800000, 1250, 1250, 1, unixepoch(), 'migration');
