-- Achievements V4: prestige identity + avatar-only material rewards.
-- Conditions remain hard-coded in src/worker.js and are intentionally not configurable here.

ALTER TABLE achievement_settings
ADD COLUMN reward_mode TEXT NOT NULL DEFAULT 'default'
CHECK(reward_mode IN ('default','none','avatar'));

ALTER TABLE achievement_settings
ADD COLUMN reward_item_id TEXT NOT NULL DEFAULT '';

ALTER TABLE achievement_settings
ADD COLUMN rarity TEXT NOT NULL DEFAULT ''
CHECK(rarity IN ('','common','rare','epic','legendary','legacy'));

ALTER TABLE achievement_settings
ADD COLUMN achievement_points INTEGER NOT NULL DEFAULT -1
CHECK(achievement_points >= -1 AND achievement_points <= 10000);
