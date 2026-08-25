-- Achievements V6: permanent unlock history, secret achievements and season history.
-- Achievement conditions and Legacy availability windows remain server-authoritative in src/worker.js.

CREATE TABLE IF NOT EXISTS achievement_unlocks (
  telegram_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_at INTEGER NOT NULL,
  source_kind TEXT NOT NULL DEFAULT '',
  season_id TEXT NOT NULL DEFAULT '',
  source_snapshot_json TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (telegram_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_achievement_unlocks_player
  ON achievement_unlocks(telegram_id, unlocked_at DESC, achievement_id);

CREATE INDEX IF NOT EXISTS idx_achievement_unlocks_achievement
  ON achievement_unlocks(achievement_id, unlocked_at DESC, telegram_id);

CREATE TABLE IF NOT EXISTS achievement_season_history (
  season_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  season_title TEXT NOT NULL DEFAULT '',
  started_at INTEGER NOT NULL DEFAULT 0,
  completed_at INTEGER NOT NULL DEFAULT 0,
  max_level INTEGER NOT NULL DEFAULT 0 CHECK(max_level BETWEEN 0 AND 50),
  premium_tier TEXT NOT NULL DEFAULT 'none',
  season_starts_at INTEGER NOT NULL DEFAULT 0,
  season_ends_at INTEGER NOT NULL DEFAULT 0,
  snapshot_json TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (season_id, telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_achievement_season_history_player
  ON achievement_season_history(telegram_id, season_ends_at DESC, season_id);

ALTER TABLE achievement_settings
ADD COLUMN secret_mode INTEGER NOT NULL DEFAULT -1
CHECK(secret_mode IN (-1,0,1));

-- Claims and showcase rows are proof that the achievement had already been earned.
INSERT OR IGNORE INTO achievement_unlocks(
  telegram_id,achievement_id,unlocked_at,source_kind,season_id,source_snapshot_json
)
SELECT telegram_id,achievement_id,
       CASE WHEN delivered_at>0 THEN delivered_at ELSE created_at END,
       'legacy_claim','',json_object('migration','0066','proof','claim')
FROM achievement_claims;

INSERT OR IGNORE INTO achievement_unlocks(
  telegram_id,achievement_id,unlocked_at,source_kind,season_id,source_snapshot_json
)
SELECT telegram_id,achievement_id,selected_at,
       'legacy_showcase','',json_object('migration','0066','proof','showcase')
FROM achievement_showcase;

-- Best-effort historical season backfill while Season Pass rows are still retained.
INSERT OR IGNORE INTO achievement_season_history(
  season_id,telegram_id,season_title,started_at,completed_at,max_level,premium_tier,
  season_starts_at,season_ends_at,snapshot_json,updated_at
)
SELECT c.season_id,c.telegram_id,COALESCE(s.title,''),
       MIN(CASE WHEN c.claimed_at>0 THEN c.claimed_at ELSE COALESCE(s.starts_at,0) END),
       CASE WHEN MAX(c.level)>=50 THEN MAX(COALESCE(c.delivered_at,c.claimed_at,0)) ELSE 0 END,
       MIN(50,MAX(c.level)),'none',COALESCE(s.starts_at,0),COALESCE(s.ends_at,0),
       json_object('migration','0066','proof','season_pass_claims','maxClaimedLevel',MAX(c.level)),
       MAX(COALESCE(c.delivered_at,c.claimed_at,0))
FROM season_pass_claims c
LEFT JOIN season_pass_seasons s ON s.season_id=c.season_id
WHERE c.status='delivered'
GROUP BY c.season_id,c.telegram_id;
