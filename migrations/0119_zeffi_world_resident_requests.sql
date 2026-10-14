-- RC-3: optional resident requests with server-verified progress and atomic rewards.
-- Additive only; does not modify city saves, profile wallet schema or existing tasks.
CREATE TABLE IF NOT EXISTS zeffi_world_resident_requests (
  telegram_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','ready','claimed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 1),
  assigned_at INTEGER NOT NULL CHECK(assigned_at >= 0),
  completed_at INTEGER,
  claimed_at INTEGER,
  claim_request_id TEXT,
  PRIMARY KEY(telegram_id,request_id),
  UNIQUE(telegram_id,template_id)
);
CREATE INDEX IF NOT EXISTS idx_zeffi_world_resident_player_status
  ON zeffi_world_resident_requests(telegram_id,status,assigned_at);

CREATE TABLE IF NOT EXISTS zeffi_world_resident_daily_claims (
  telegram_id TEXT NOT NULL,
  day_utc TEXT NOT NULL,
  claims INTEGER NOT NULL DEFAULT 0 CHECK(claims BETWEEN 0 AND 2),
  last_request_id TEXT NOT NULL DEFAULT '',
  PRIMARY KEY(telegram_id,day_utc)
);

CREATE TABLE IF NOT EXISTS zeffi_world_resident_claim_receipts (
  telegram_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  claim_request_id TEXT NOT NULL,
  day_utc TEXT NOT NULL,
  reward_points INTEGER NOT NULL DEFAULT 0 CHECK(reward_points >= 0),
  reward_treats INTEGER NOT NULL DEFAULT 0 CHECK(reward_treats >= 0),
  created_at INTEGER NOT NULL,
  request_guard INTEGER NOT NULL CHECK(request_guard=1),
  daily_guard INTEGER NOT NULL CHECK(daily_guard=1),
  profile_guard INTEGER NOT NULL CHECK(profile_guard=1),
  PRIMARY KEY(telegram_id,claim_request_id),
  UNIQUE(telegram_id,request_id)
);
