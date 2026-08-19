-- 1.0.x: server-side referral program "Друзья кафе".
-- Referral binding, activity milestones, network milestones and idempotent rewards.

CREATE TABLE IF NOT EXISTS referral_program_config (
  id INTEGER PRIMARY KEY CHECK(id=1),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  bind_window_hours INTEGER NOT NULL DEFAULT 24 CHECK(bind_window_hours BETWEEN 1 AND 720),
  bind_max_runs INTEGER NOT NULL DEFAULT 0 CHECK(bind_max_runs BETWEEN 0 AND 20),
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);
INSERT OR IGNORE INTO referral_program_config(id,enabled,bind_window_hours,bind_max_runs,updated_at,updated_by)
VALUES(1,1,24,0,unixepoch(),'migration-0046');

CREATE TABLE IF NOT EXISTS referral_codes (
  telegram_id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);

CREATE TABLE IF NOT EXISTS referral_links (
  invitee_telegram_id TEXT PRIMARY KEY,
  referrer_telegram_id TEXT NOT NULL,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'invited' CHECK(status IN ('invited','active','blocked')),
  bound_at INTEGER NOT NULL,
  activated_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_referral_links_referrer ON referral_links(referrer_telegram_id,status,bound_at DESC);

CREATE TABLE IF NOT EXISTS referral_milestones (
  milestone_key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  trigger_type TEXT NOT NULL CHECK(trigger_type IN ('accepted_runs','profile_level','season_tier')),
  trigger_value TEXT NOT NULL,
  inviter_reward_json TEXT NOT NULL DEFAULT '{"kind":"none"}',
  invitee_reward_json TEXT NOT NULL DEFAULT '{"kind":"none"}',
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);

INSERT OR IGNORE INTO referral_milestones VALUES
('starter','Стартовые задания','Заверши 3 подтверждённых забега','accepted_runs','3','{"kind":"case","id":"small","amount":1}','{"kind":"booster","id":"points","amount":1}',1,10,unixepoch(),unixepoch(),'migration-0046'),
('level_5','5 уровень','Достигни 5 уровня профиля','profile_level','5','{"kind":"case","id":"sweet","amount":1}','{"kind":"case","id":"small","amount":1}',1,20,unixepoch(),unixepoch(),'migration-0046'),
('level_10','10 уровень','Достигни 10 уровня профиля','profile_level','10','{"kind":"points","amount":1500}','{"kind":"booster","id":"treats","amount":1}',1,30,unixepoch(),unixepoch(),'migration-0046'),
('elite','Элитный','Активируй Элитный сезонный пропуск','season_tier','elite','{"kind":"season_pass_xp","amount":1000}','{"kind":"none"}',1,40,unixepoch(),unixepoch(),'migration-0046'),
('elite_plus','Элитный+','Активируй Элитный+ сезонный пропуск','season_tier','elite_plus','{"kind":"season_pass_xp","amount":1500}','{"kind":"none"}',1,50,unixepoch(),unixepoch(),'migration-0046'),
('level_20','20 уровень','Достигни 20 уровня профиля','profile_level','20','{"kind":"case","id":"gold","amount":1}','{"kind":"case","id":"sweet","amount":1}',1,60,unixepoch(),unixepoch(),'migration-0046');

CREATE TABLE IF NOT EXISTS referral_progress (
  invitee_telegram_id TEXT NOT NULL,
  milestone_key TEXT NOT NULL,
  achieved_at INTEGER NOT NULL,
  source_json TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY(invitee_telegram_id,milestone_key)
);
CREATE INDEX IF NOT EXISTS idx_referral_progress_achieved ON referral_progress(achieved_at DESC);

CREATE TABLE IF NOT EXISTS referral_network_milestones (
  threshold INTEGER PRIMARY KEY CHECK(threshold BETWEEN 1 AND 10000),
  title TEXT NOT NULL,
  reward_json TEXT NOT NULL DEFAULT '{"kind":"none"}',
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);
INSERT OR IGNORE INTO referral_network_milestones VALUES
(1,'Первый друг','{"kind":"case","id":"small","amount":1}',1,10,unixepoch(),unixepoch(),'migration-0046'),
(3,'Компания из 3 друзей','{"kind":"case","id":"sweet","amount":1}',1,20,unixepoch(),unixepoch(),'migration-0046'),
(5,'5 активных друзей','{"kind":"points","amount":3000}',1,30,unixepoch(),unixepoch(),'migration-0046'),
(10,'10 активных друзей','{"kind":"case","id":"gold","amount":1}',1,40,unixepoch(),unixepoch(),'migration-0046'),
(20,'20 активных друзей','{"kind":"case","id":"gold","amount":2}',1,50,unixepoch(),unixepoch(),'migration-0046'),
(50,'50 активных друзей','{"kind":"case","id":"legendary","amount":1}',1,60,unixepoch(),unixepoch(),'migration-0046');

CREATE TABLE IF NOT EXISTS referral_network_progress (
  referrer_telegram_id TEXT NOT NULL,
  threshold INTEGER NOT NULL,
  achieved_at INTEGER NOT NULL,
  PRIMARY KEY(referrer_telegram_id,threshold)
);

CREATE TABLE IF NOT EXISTS referral_rewards (
  reward_id TEXT PRIMARY KEY,
  invitee_telegram_id TEXT NOT NULL DEFAULT '',
  beneficiary_telegram_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('referrer','invitee')),
  source_type TEXT NOT NULL CHECK(source_type IN ('milestone','network')),
  source_key TEXT NOT NULL,
  reward_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','delivered','failed')),
  target_season_id TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  delivered_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  error_text TEXT NOT NULL DEFAULT '',
  UNIQUE(beneficiary_telegram_id,source_type,source_key)
);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_beneficiary ON referral_rewards(beneficiary_telegram_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_invitee ON referral_rewards(invitee_telegram_id,created_at DESC);

CREATE TABLE IF NOT EXISTS referral_reward_effects (
  reward_id TEXT PRIMARY KEY,
  beneficiary_telegram_id TEXT NOT NULL,
  apply_token TEXT NOT NULL,
  applied_at INTEGER NOT NULL
);
