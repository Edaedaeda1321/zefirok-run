-- 4.0.12: подарочные кейсы для компенсаций через админ-панель и Telegram-бота.

CREATE TABLE IF NOT EXISTS granted_cases (
  id TEXT PRIMARY KEY,
  telegram_id TEXT NOT NULL,
  case_type TEXT NOT NULL CHECK(case_type IN ('small', 'sweet', 'gold')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'opening', 'opened')),
  granted_by TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  rewards_json TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  opened_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_granted_cases_player_pending
ON granted_cases(telegram_id, status, case_type, created_at);

CREATE INDEX IF NOT EXISTS idx_granted_cases_created
ON granted_cases(created_at DESC);
