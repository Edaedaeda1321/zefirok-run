-- 5.0.1: Легендарный кейс и гарантированная награда на 50-м открытии.

ALTER TABLE case_player_state
ADD COLUMN legendary_pity_counter INTEGER NOT NULL DEFAULT 0
CHECK(legendary_pity_counter >= 0 AND legendary_pity_counter <= 49);

-- SQLite не позволяет изменить CHECK существующего столбца напрямую,
-- поэтому пересоздаём таблицу, сохраняя прежнюю структуру и все данные.
ALTER TABLE granted_cases RENAME TO granted_cases_before_legendary;

CREATE TABLE granted_cases (
  id TEXT PRIMARY KEY,
  telegram_id TEXT NOT NULL,
  case_type TEXT NOT NULL CHECK(case_type IN ('small', 'sweet', 'gold', 'legendary')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'opening', 'opened')),
  granted_by TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  rewards_json TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  opened_at INTEGER
);

INSERT INTO granted_cases (
  id,
  telegram_id,
  case_type,
  status,
  granted_by,
  reason,
  rewards_json,
  created_at,
  opened_at
)
SELECT
  id,
  telegram_id,
  case_type,
  status,
  granted_by,
  reason,
  rewards_json,
  created_at,
  opened_at
FROM granted_cases_before_legendary;

DROP TABLE granted_cases_before_legendary;

CREATE INDEX IF NOT EXISTS idx_granted_cases_player_pending
ON granted_cases(telegram_id, status, case_type, created_at);

CREATE INDEX IF NOT EXISTS idx_granted_cases_created
ON granted_cases(created_at DESC);
