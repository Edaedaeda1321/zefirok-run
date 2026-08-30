-- Permanent achievement-showcase ownership and special seasonal-case rewards.
-- Seasonal showcase styles are account entitlements: once earned they do not expire with the season.

CREATE TABLE IF NOT EXISTS achievement_showcase_style_ownership (
  telegram_id TEXT NOT NULL,
  style_id TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT '',
  source_id TEXT NOT NULL DEFAULT '',
  unlocked_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (telegram_id, style_id)
);

CREATE INDEX IF NOT EXISTS idx_achievement_showcase_style_owner
  ON achievement_showcase_style_ownership(telegram_id, unlocked_at DESC, style_id);

CREATE TABLE IF NOT EXISTS season_pass_case_special_items (
  case_id TEXT NOT NULL,
  item_key TEXT NOT NULL,
  reward_kind TEXT NOT NULL CHECK(reward_kind IN ('showcase_style')),
  item_id TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1 CHECK(weight >= 0),
  rarity TEXT NOT NULL DEFAULT 'seasonal',
  title TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  PRIMARY KEY (case_id, item_key)
);

CREATE INDEX IF NOT EXISTS idx_season_pass_case_special_items_enabled
  ON season_pass_case_special_items(case_id, enabled, reward_kind);

-- Compatibility with the former generic "seasonal" showcase style.
-- Players who had explicitly selected it keep the Season 1 cafe showcase permanently.
INSERT OR IGNORE INTO achievement_showcase_style_ownership(
  telegram_id, style_id, source_type, source_id, unlocked_at, updated_at
)
SELECT telegram_id, 'season_1_cafe', 'legacy_preference', 'seasonal',
       CASE WHEN updated_at > 0 THEN updated_at ELSE CAST(strftime('%s','now') AS INTEGER) END,
       CASE WHEN updated_at > 0 THEN updated_at ELSE CAST(strftime('%s','now') AS INTEGER) END
FROM achievement_showcase_preferences
WHERE style_id = 'seasonal';

-- The former seasonal style was unlocked by completing the two-member "season-path" series.
-- Preserve that historical entitlement for players who completed it before this migration.
INSERT OR IGNORE INTO achievement_showcase_style_ownership(
  telegram_id, style_id, source_type, source_id, unlocked_at, updated_at
)
SELECT telegram_id, 'season_1_cafe', 'legacy_series', 'season-path',
       MAX(unlocked_at), MAX(unlocked_at)
FROM achievement_unlocks
WHERE achievement_id IN ('season-reward-1', 'season-reward-10')
GROUP BY telegram_id
HAVING COUNT(DISTINCT achievement_id) = 2;

-- Direct Season Pass proof for players whose old achievements were completed before unlock-history tracking.
-- The former season-path series completed as soon as the account had received at least 10 pass rewards.
INSERT OR IGNORE INTO achievement_showcase_style_ownership(
  telegram_id, style_id, source_type, source_id, unlocked_at, updated_at
)
SELECT telegram_id, 'season_1_cafe', 'legacy_season_pass', 'seasonRewards>=10',
       MAX(CASE WHEN delivered_at > 0 THEN delivered_at ELSE claimed_at END),
       MAX(CASE WHEN delivered_at > 0 THEN delivered_at ELSE claimed_at END)
FROM season_pass_claims
WHERE status = 'delivered'
GROUP BY telegram_id
HAVING COUNT(*) >= 10;

UPDATE achievement_showcase_preferences
SET style_id = 'season_1_cafe'
WHERE style_id = 'seasonal';
