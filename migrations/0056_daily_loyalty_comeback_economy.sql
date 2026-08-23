-- v1.0.10: comeback rewards + server-side economy guard for daily loyalty.
-- A returning player receives at most one comeback reward per return day: the
-- highest enabled tier whose missed-day threshold is satisfied.

CREATE TABLE IF NOT EXISTS daily_loyalty_comeback_tiers (
  season_id TEXT NOT NULL,
  tier_days INTEGER NOT NULL CHECK(tier_days BETWEEN 1 AND 3650),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  title TEXT NOT NULL DEFAULT '',
  points_threshold INTEGER NOT NULL DEFAULT 0 CHECK(points_threshold BETWEEN 0 AND 1000000000),
  zefir_threshold INTEGER NOT NULL DEFAULT 0 CHECK(zefir_threshold BETWEEN 0 AND 1000000000),
  coffee_threshold INTEGER NOT NULL DEFAULT 0 CHECK(coffee_threshold BETWEEN 0 AND 1000000000),
  fallback_reward_json TEXT NOT NULL DEFAULT '{}',
  low_points_reward_json TEXT NOT NULL DEFAULT '{}',
  low_zefir_reward_json TEXT NOT NULL DEFAULT '{}',
  low_coffee_reward_json TEXT NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(season_id,tier_days)
);
CREATE INDEX IF NOT EXISTS idx_daily_loyalty_comeback_tiers
ON daily_loyalty_comeback_tiers(season_id,enabled,tier_days);

CREATE TABLE IF NOT EXISTS daily_loyalty_comeback_claims (
  telegram_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  return_day_key TEXT NOT NULL,
  missed_days INTEGER NOT NULL DEFAULT 0,
  tier_days INTEGER NOT NULL DEFAULT 0,
  selection_reason TEXT NOT NULL DEFAULT 'fallback',
  balance_points INTEGER NOT NULL DEFAULT 0,
  balance_zefir INTEGER NOT NULL DEFAULT 0,
  balance_coffee INTEGER NOT NULL DEFAULT 0,
  reward_type TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 1,
  item_id TEXT NOT NULL DEFAULT '',
  label TEXT NOT NULL DEFAULT '',
  reward_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'granting' CHECK(status IN ('granting','delivered','failed')),
  source_request_id TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  delivered_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(telegram_id,season_id,return_day_key)
);
CREATE INDEX IF NOT EXISTS idx_daily_loyalty_comeback_claims_season
ON daily_loyalty_comeback_claims(season_id,created_at DESC,tier_days,status);
CREATE INDEX IF NOT EXISTS idx_daily_loyalty_comeback_claims_player
ON daily_loyalty_comeback_claims(telegram_id,season_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_loyalty_comeback_claims_request
ON daily_loyalty_comeback_claims(source_request_id,status);

CREATE TABLE IF NOT EXISTS daily_loyalty_economy_guard (
  season_id TEXT PRIMARY KEY,
  audience_size INTEGER NOT NULL DEFAULT 10000 CHECK(audience_size BETWEEN 1 AND 100000000),
  hard_points_per_claim INTEGER NOT NULL DEFAULT 250000 CHECK(hard_points_per_claim BETWEEN 1 AND 1000000000),
  hard_zefir_per_claim INTEGER NOT NULL DEFAULT 5000 CHECK(hard_zefir_per_claim BETWEEN 1 AND 1000000000),
  hard_coffee_per_claim INTEGER NOT NULL DEFAULT 5000 CHECK(hard_coffee_per_claim BETWEEN 1 AND 1000000000),
  hard_cases_per_claim INTEGER NOT NULL DEFAULT 5 CHECK(hard_cases_per_claim BETWEEN 1 AND 20),
  require_confirmation INTEGER NOT NULL DEFAULT 1 CHECK(require_confirmation IN (0,1)),
  updated_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO daily_loyalty_economy_guard(
  season_id,audience_size,hard_points_per_claim,hard_zefir_per_claim,
  hard_coffee_per_claim,hard_cases_per_claim,require_confirmation,updated_at
) VALUES('daily-main',10000,250000,5000,5000,5,1,unixepoch());

-- Conservative default comeback table. Rewards are intentionally useful but
-- much smaller than long-term progression rewards. The server can swap the
-- fallback for a low-balance alternative when that resource is scarce.
INSERT OR IGNORE INTO daily_loyalty_comeback_tiers(
  season_id,tier_days,enabled,title,points_threshold,zefir_threshold,coffee_threshold,
  fallback_reward_json,low_points_reward_json,low_zefir_reward_json,low_coffee_reward_json,
  sort_order,created_at,updated_at
) VALUES
('daily-main',3,1,'С возвращением',1500,120,120,
 '{"type":"points","amount":1000,"itemId":"","label":"1 000 очков"}',
 '{"type":"points","amount":1500,"itemId":"","label":"1 500 очков"}',
 '{"type":"zefir","amount":60,"itemId":"","label":"60 зефира"}',
 '{"type":"coffee","amount":60,"itemId":"","label":"60 кофе"}',
 3,unixepoch(),unixepoch()),
('daily-main',7,1,'Мы скучали',4000,250,250,
 '{"type":"case","amount":1,"itemId":"small","label":"Обычный кейс"}',
 '{"type":"points","amount":3000,"itemId":"","label":"3 000 очков"}',
 '{"type":"zefir","amount":120,"itemId":"","label":"120 зефира"}',
 '{"type":"coffee","amount":120,"itemId":"","label":"120 кофе"}',
 7,unixepoch(),unixepoch()),
('daily-main',14,1,'Большое возвращение',8000,500,500,
 '{"type":"case","amount":1,"itemId":"gold","label":"Золотой кейс"}',
 '{"type":"points","amount":6000,"itemId":"","label":"6 000 очков"}',
 '{"type":"zefir","amount":250,"itemId":"","label":"250 зефира"}',
 '{"type":"coffee","amount":250,"itemId":"","label":"250 кофе"}',
 14,unixepoch(),unixepoch());
