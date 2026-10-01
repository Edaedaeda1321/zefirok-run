-- Game Task Reward Engine V2.
-- Task Hub rewards are claimed synchronously and atomically, without routing new
-- claims through the shared reward_delivery_queue. Legacy task/queue tables stay
-- intact for other systems and for safe reconciliation of historical claims.

CREATE TABLE IF NOT EXISTS game_task_reward_claims (
  claim_id TEXT PRIMARY KEY,
  telegram_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('task','series')),
  task_key TEXT NOT NULL,
  cycle_key TEXT NOT NULL,
  reward_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','claimed')),
  apply_token TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  claimed_at INTEGER NOT NULL DEFAULT 0,
  UNIQUE(telegram_id,kind,task_key,cycle_key)
);

CREATE INDEX IF NOT EXISTS idx_game_task_reward_claims_player
ON game_task_reward_claims(telegram_id, claimed_at DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_task_reward_claims_status
ON game_task_reward_claims(status, updated_at);

CREATE INDEX IF NOT EXISTS idx_game_task_reward_claims_task_analytics
ON game_task_reward_claims(kind, task_key, status, created_at);

-- Historical task claims that were already finalized by the old queue are safe
-- to mark as claimed in V2. Pending legacy claims are intentionally NOT copied:
-- the Worker reconciles their already-delivered components at claim time and
-- directly grants only the missing components before superseding old queue rows.
INSERT OR IGNORE INTO game_task_reward_claims(
  claim_id,telegram_id,kind,task_key,cycle_key,reward_json,status,apply_token,created_at,updated_at,claimed_at
)
SELECT
  'gtr:v2:task:' || c.claim_key,
  c.telegram_id,
  'task',
  c.chain_key,
  c.cycle_key,
  COALESCE(NULLIF(r.reward_json,''),NULLIF(c.reward_json,''),'{}'),
  'claimed','',
  c.created_at,
  CASE WHEN c.updated_at>0 THEN c.updated_at ELSE unixepoch() END,
  CASE WHEN c.claimed_at>0 THEN c.claimed_at ELSE CASE WHEN c.updated_at>0 THEN c.updated_at ELSE unixepoch() END END
FROM player_task_claims c
LEFT JOIN player_game_tasks r
  ON r.telegram_id=c.telegram_id AND r.kind='task' AND r.task_key=c.chain_key AND r.cycle_key=c.cycle_key
WHERE c.status='claimed';

INSERT OR IGNORE INTO game_task_reward_claims(
  claim_id,telegram_id,kind,task_key,cycle_key,reward_json,status,apply_token,created_at,updated_at,claimed_at
)
SELECT
  'gtr:v2:series:' || c.claim_key,
  c.telegram_id,
  'series',
  c.series_key,
  c.cycle_key,
  COALESCE(NULLIF(r.reward_json,''),NULLIF(s.final_reward_json,''),'{}'),
  'claimed','',
  c.created_at,
  CASE WHEN c.updated_at>0 THEN c.updated_at ELSE unixepoch() END,
  CASE WHEN c.claimed_at>0 THEN c.claimed_at ELSE CASE WHEN c.updated_at>0 THEN c.updated_at ELSE unixepoch() END END
FROM player_task_series_claims c
LEFT JOIN player_game_tasks r
  ON r.telegram_id=c.telegram_id AND r.kind='series' AND r.task_key=c.series_key AND r.cycle_key=c.cycle_key
LEFT JOIN task_series s ON s.series_key=c.series_key
WHERE c.status='claimed';
