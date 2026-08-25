-- Achievements V3: safe Control Center overrides and player showcase.
-- Achievement conditions stay hard-coded in Worker; CC can only change presentation/reward settings.

CREATE TABLE IF NOT EXISTS achievement_settings (
  achievement_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  visible INTEGER NOT NULL DEFAULT 1 CHECK(visible IN (0,1)),
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  reward_kind TEXT NOT NULL DEFAULT '' CHECK(reward_kind IN ('','points','zefir','coffee')),
  reward_amount INTEGER NOT NULL DEFAULT 0 CHECK(reward_amount >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision >= 1),
  updated_at INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_achievement_settings_visibility
ON achievement_settings(enabled, visible, sort_order, achievement_id);

CREATE TABLE IF NOT EXISTS achievement_showcase (
  telegram_id TEXT NOT NULL,
  slot INTEGER NOT NULL CHECK(slot BETWEEN 1 AND 3),
  achievement_id TEXT NOT NULL,
  selected_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(telegram_id, slot),
  UNIQUE(telegram_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_achievement_showcase_player
ON achievement_showcase(telegram_id, slot);

CREATE INDEX IF NOT EXISTS idx_achievement_showcase_achievement
ON achievement_showcase(achievement_id, telegram_id);
