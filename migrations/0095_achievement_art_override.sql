-- Achievement art override from Control Center.
-- Keep this migration self-contained so old integration snapshots can still
-- advance through the migration chain safely.
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
  updated_by TEXT NOT NULL DEFAULT '',
  reward_mode TEXT NOT NULL DEFAULT 'default' CHECK(reward_mode IN ('default','none','avatar')),
  reward_item_id TEXT NOT NULL DEFAULT '',
  rarity TEXT NOT NULL DEFAULT '' CHECK(rarity IN ('','common','rare','epic','legendary','legacy')),
  achievement_points INTEGER NOT NULL DEFAULT -1 CHECK(achievement_points >= -1 AND achievement_points <= 10000),
  secret_mode INTEGER NOT NULL DEFAULT -1 CHECK(secret_mode IN (-1,0,1))
);

ALTER TABLE achievement_settings
ADD COLUMN art_url TEXT NOT NULL DEFAULT '';
