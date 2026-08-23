-- v0.78: employee training and controlled player resets
ALTER TABLE admin_profile_state ADD COLUMN treats_override INTEGER;
ALTER TABLE admin_profile_state ADD COLUMN coffee_override INTEGER;
ALTER TABLE admin_profile_state ADD COLUMN best_score_override INTEGER;
ALTER TABLE admin_profile_state ADD COLUMN profile_xp_override INTEGER;

CREATE TABLE IF NOT EXISTS staff_training_progress (
  telegram_id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  training_version INTEGER NOT NULL DEFAULT 1,
  step_index INTEGER NOT NULL DEFAULT 0,
  quiz_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started','in_progress','completed')),
  started_at INTEGER NOT NULL DEFAULT 0,
  completed_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);

-- Existing staff keep access and are marked as already trained.
INSERT OR IGNORE INTO staff_training_progress(
  telegram_id, role, training_version, step_index, quiz_score, status,
  started_at, completed_at, updated_at, updated_by
)
SELECT telegram_id, role, 1, 4, 1, 'completed', added_at,
       CASE WHEN updated_at > 0 THEN updated_at ELSE added_at END,
       CASE WHEN updated_at > 0 THEN updated_at ELSE added_at END,
       'migration-v0.78'
FROM staff_users;

CREATE TABLE IF NOT EXISTS player_reset_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reset_id TEXT NOT NULL UNIQUE,
  scope TEXT NOT NULL CHECK(scope IN ('one','all')),
  target_telegram_id TEXT NOT NULL DEFAULT '',
  components_json TEXT NOT NULL DEFAULT '[]',
  reason TEXT NOT NULL,
  affected_count INTEGER NOT NULL DEFAULT 0,
  notification_status TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_player_reset_history_recent ON player_reset_history(created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS player_reset_acknowledgements (
  reset_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  applied_at INTEGER NOT NULL,
  PRIMARY KEY(reset_id, telegram_id)
);
CREATE INDEX IF NOT EXISTS idx_player_reset_ack_player
ON player_reset_acknowledgements(telegram_id, applied_at DESC);

CREATE TABLE IF NOT EXISTS player_reset_directives (
  reset_id TEXT PRIMARY KEY,
  scope TEXT NOT NULL CHECK(scope IN ('one','all')),
  target_telegram_id TEXT NOT NULL DEFAULT '',
  reset_json TEXT NOT NULL DEFAULT '{}',
  reason TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_player_reset_directives_target ON player_reset_directives(active,target_telegram_id,created_at DESC);
