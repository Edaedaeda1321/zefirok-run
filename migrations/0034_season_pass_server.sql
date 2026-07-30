-- v0.79.37: server-side seasonal pass, real account rewards and Elite+ XP entitlement.

CREATE TABLE IF NOT EXISTS season_pass_seasons (
  season_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  manual_status TEXT NOT NULL DEFAULT '' CHECK(manual_status IN ('','active','ended')),
  base_run_xp INTEGER NOT NULL DEFAULT 100,
  level_price_points INTEGER NOT NULL DEFAULT 0,
  elite_price_points INTEGER NOT NULL DEFAULT 0,
  elite_price_treats INTEGER NOT NULL DEFAULT 0,
  elite_price_coffee INTEGER NOT NULL DEFAULT 0,
  elite_plus_price_points INTEGER NOT NULL DEFAULT 0,
  elite_plus_price_treats INTEGER NOT NULL DEFAULT 0,
  elite_plus_price_coffee INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS season_pass_rewards (
  season_id TEXT NOT NULL,
  level INTEGER NOT NULL CHECK(level BETWEEN 1 AND 50),
  lane TEXT NOT NULL CHECK(lane IN ('free','premium')),
  reward_type TEXT NOT NULL CHECK(reward_type IN ('points','treats','coffee','case')),
  amount INTEGER NOT NULL DEFAULT 1 CHECK(amount >= 0),
  item_id TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT '',
  PRIMARY KEY(season_id,level,lane)
);

CREATE TABLE IF NOT EXISTS season_pass_players (
  season_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0 CHECK(xp >= 0),
  premium_tier TEXT NOT NULL DEFAULT 'none' CHECK(premium_tier IN ('none','elite','elite_plus')),
  elite_plus_bonus_granted INTEGER NOT NULL DEFAULT 0 CHECK(elite_plus_bonus_granted IN (0,1)),
  revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(season_id,telegram_id)
);

CREATE TABLE IF NOT EXISTS season_pass_run_xp (
  run_id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  base_xp INTEGER NOT NULL,
  multiplier INTEGER NOT NULL DEFAULT 1,
  xp_awarded INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_season_pass_run_player
ON season_pass_run_xp(season_id,telegram_id,created_at);

CREATE TABLE IF NOT EXISTS season_pass_claims (
  season_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  level INTEGER NOT NULL,
  lane TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','delivered','failed')),
  reward_json TEXT NOT NULL DEFAULT '{}',
  claimed_at INTEGER NOT NULL,
  delivered_at INTEGER NOT NULL DEFAULT 0,
  error_text TEXT NOT NULL DEFAULT '',
  PRIMARY KEY(season_id,telegram_id,level,lane)
);
CREATE INDEX IF NOT EXISTS idx_season_pass_claims_player
ON season_pass_claims(season_id,telegram_id,status,level);

CREATE TABLE IF NOT EXISTS season_pass_entitlements (
  season_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT '',
  granted_at INTEGER NOT NULL,
  PRIMARY KEY(season_id,telegram_id,item_id)
);

CREATE TABLE IF NOT EXISTS season_pass_purchases (
  season_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  purchase_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','delivered')),
  price_points INTEGER NOT NULL DEFAULT 0,
  price_treats INTEGER NOT NULL DEFAULT 0,
  price_coffee INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  completed_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(season_id,telegram_id,purchase_key)
);

-- owned_specials_json is added conditionally by Worker runtime because SQLite
-- does not support ALTER TABLE ... ADD COLUMN IF NOT EXISTS.

INSERT OR IGNORE INTO season_pass_seasons(
  season_id,title,starts_at,ends_at,manual_status,base_run_xp,level_price_points,
  elite_price_points,elite_price_treats,elite_price_coffee,
  elite_plus_price_points,elite_plus_price_treats,elite_plus_price_coffee,
  updated_at,updated_by
) VALUES(
  'season-1-cafe-opening','Сезон I: Открытие Кафе',1786309200,1789073999,'',100,0,
  0,0,0,0,0,0,unixepoch(),'migration-0034'
);
