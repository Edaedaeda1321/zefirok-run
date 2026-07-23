CREATE TABLE IF NOT EXISTS admin_profile_state (
  telegram_id TEXT PRIMARY KEY,
  wallet INTEGER NOT NULL DEFAULT 0 CHECK(wallet >= 0),
  best_score INTEGER NOT NULL DEFAULT 0 CHECK(best_score >= 0),
  treats INTEGER NOT NULL DEFAULT 0 CHECK(treats >= 0),
  coffee INTEGER NOT NULL DEFAULT 0 CHECK(coffee >= 0),
  profile_xp INTEGER NOT NULL DEFAULT 0 CHECK(profile_xp >= 0),
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision >= 1),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);
