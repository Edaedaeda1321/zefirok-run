-- Мир Зеффи v0.2.0: additive-only personal cities within existing zefirok-rewards D1.
-- Does not alter/delete any legacy account, case, run, task or currency tables.
-- The server owns city mutations; wallet balances remain authoritative in
-- admin_profile_state (wallet = points, treats = zefir, coffee = coffee).
CREATE TABLE IF NOT EXISTS zeffi_world_cities (
  telegram_id TEXT PRIMARY KEY NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  state_json TEXT NOT NULL CHECK (json_valid(state_json)),
  last_request_id TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_zeffi_world_cities_updated ON zeffi_world_cities(updated_at DESC);

CREATE TABLE IF NOT EXISTS zeffi_world_operations (
  telegram_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  action_kind TEXT NOT NULL,
  city_revision INTEGER NOT NULL,
  cost_points INTEGER NOT NULL DEFAULT 0 CHECK (cost_points >= 0),
  cost_treats INTEGER NOT NULL DEFAULT 0 CHECK (cost_treats >= 0),
  cost_coffee INTEGER NOT NULL DEFAULT 0 CHECK (cost_coffee >= 0),
  created_at INTEGER NOT NULL,
  city_guard INTEGER NOT NULL CHECK (city_guard = 1),
  profile_guard INTEGER NOT NULL CHECK (profile_guard = 1),
  PRIMARY KEY (telegram_id, request_id)
);
CREATE INDEX IF NOT EXISTS idx_zeffi_world_operations_player_time
  ON zeffi_world_operations(telegram_id,created_at DESC);
