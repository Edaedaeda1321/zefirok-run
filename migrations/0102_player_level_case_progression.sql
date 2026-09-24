-- 2026-09-24: расширенная прогрессия наград за уровень игрока.
-- Уровневые награды теперь могут использовать мифические и легендарные кейсы.
-- История уже открытых уровней сохраняется без изменений.

ALTER TABLE level_case_openings RENAME TO level_case_openings_before_progression;

CREATE TABLE level_case_openings (
  telegram_id TEXT NOT NULL,
  level INTEGER NOT NULL,
  case_type TEXT NOT NULL CHECK(case_type IN ('small', 'sweet', 'gold', 'mythic', 'legendary')),
  case_count INTEGER NOT NULL DEFAULT 1 CHECK(case_count BETWEEN 1 AND 2),
  rewards_json TEXT NOT NULL DEFAULT '[]',
  opened_at INTEGER NOT NULL,
  PRIMARY KEY (telegram_id, level)
);

INSERT INTO level_case_openings (
  telegram_id,
  level,
  case_type,
  case_count,
  rewards_json,
  opened_at
)
SELECT
  telegram_id,
  level,
  case_type,
  1,
  rewards_json,
  opened_at
FROM level_case_openings_before_progression;

DROP TABLE level_case_openings_before_progression;

CREATE INDEX IF NOT EXISTS idx_level_case_openings_player
ON level_case_openings(telegram_id, opened_at DESC);

CREATE INDEX IF NOT EXISTS idx_level_case_openings_overview
ON level_case_openings(opened_at);
