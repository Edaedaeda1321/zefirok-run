CREATE TABLE IF NOT EXISTS staff_custom_names (
  telegram_id TEXT PRIMARY KEY,
  custom_name TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_staff_custom_names_updated
ON staff_custom_names(updated_at DESC);
