-- Atomic receipts for direct owner grants. No player data is removed.
CREATE TABLE IF NOT EXISTS owner_grant_operations (
  operation_id TEXT PRIMARY KEY,
  actor_telegram_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
  result_json TEXT NOT NULL CHECK(json_valid(result_json)),
  created_at INTEGER NOT NULL,
  UNIQUE(actor_telegram_id,request_id)
);
CREATE INDEX IF NOT EXISTS idx_owner_grant_player_time
  ON owner_grant_operations(telegram_id,created_at DESC);
