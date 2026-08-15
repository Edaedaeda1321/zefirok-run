-- Sweet Run: incremental Battle Pass task progress.
-- Removes repeated SUM/COUNT history scans from run/case settlement while preserving
-- current daily/weekly progress for players that existed before this migration.

CREATE TABLE IF NOT EXISTS season_pass_task_progress (
  season_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  period_key TEXT NOT NULL,
  period TEXT NOT NULL CHECK(period IN ('daily','weekly')),
  runs INTEGER NOT NULL DEFAULT 0 CHECK(runs >= 0),
  score INTEGER NOT NULL DEFAULT 0 CHECK(score >= 0),
  treats INTEGER NOT NULL DEFAULT 0 CHECK(treats >= 0),
  coffee INTEGER NOT NULL DEFAULT 0 CHECK(coffee >= 0),
  cases_opened INTEGER NOT NULL DEFAULT 0 CHECK(cases_opened >= 0),
  initialized_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (season_id, telegram_id, period_key)
);

CREATE INDEX IF NOT EXISTS idx_season_pass_task_progress_player
ON season_pass_task_progress(season_id, telegram_id, period, period_key);

-- Backfill today's Moscow-time counters for an already-running season. This is
-- intentionally INSERT OR IGNORE: deployments are safe if runtime lazy backfill
-- has already created a row for a player.
WITH clock AS (
  SELECT
    unixepoch() AS now_s,
    unixepoch(date('now','+3 hours')) - 10800 AS period_start,
    unixepoch(date('now','+3 hours')) - 10800 + 86400 AS period_end,
    'D:' || strftime('%Y-%m-%d','now','+3 hours') AS period_key
), active_players AS (
  SELECT p.season_id,p.telegram_id,
         MAX(s.starts_at,c.period_start) AS start_at,
         MIN(s.ends_at,c.period_end) AS end_at,
         c.period_key,c.now_s
  FROM season_pass_players p
  JOIN season_pass_seasons s ON s.season_id=p.season_id
  CROSS JOIN clock c
  WHERE (s.manual_status='active' OR (COALESCE(s.manual_status,'')='' AND s.starts_at<=c.now_s AND s.ends_at>c.now_s))
)
INSERT OR IGNORE INTO season_pass_task_progress(
  season_id,telegram_id,period_key,period,runs,score,treats,coffee,cases_opened,initialized_at,updated_at
)
SELECT ap.season_id,ap.telegram_id,ap.period_key,'daily',
  (SELECT COUNT(*) FROM season_pass_activity_runs r WHERE r.season_id=ap.season_id AND r.telegram_id=ap.telegram_id AND r.created_at>=ap.start_at AND r.created_at<ap.end_at),
  COALESCE((SELECT SUM(r.score) FROM season_pass_activity_runs r WHERE r.season_id=ap.season_id AND r.telegram_id=ap.telegram_id AND r.created_at>=ap.start_at AND r.created_at<ap.end_at),0),
  COALESCE((SELECT SUM(r.run_treats) FROM season_pass_activity_runs r WHERE r.season_id=ap.season_id AND r.telegram_id=ap.telegram_id AND r.created_at>=ap.start_at AND r.created_at<ap.end_at),0),
  COALESCE((SELECT SUM(r.run_coffee) FROM season_pass_activity_runs r WHERE r.season_id=ap.season_id AND r.telegram_id=ap.telegram_id AND r.created_at>=ap.start_at AND r.created_at<ap.end_at),0),
  (SELECT COUNT(*) FROM level_case_openings c WHERE c.telegram_id=ap.telegram_id AND c.opened_at>=ap.start_at AND c.opened_at<ap.end_at)
  + (SELECT COUNT(*) FROM granted_cases c WHERE c.telegram_id=ap.telegram_id AND c.status='opened' AND c.opened_at>=ap.start_at AND c.opened_at<ap.end_at)
  + (SELECT COUNT(*) FROM season_pass_case_grants c WHERE c.telegram_id=ap.telegram_id AND c.status='opened' AND c.opened_at>=ap.start_at AND c.opened_at<ap.end_at),
  ap.now_s,ap.now_s
FROM active_players ap
WHERE ap.end_at>ap.start_at;

-- Backfill the current Moscow week (Monday 00:00 MSK).
WITH clock AS (
  SELECT
    unixepoch() AS now_s,
    (unixepoch(date('now','+3 hours')) - 10800)
      - (((CAST(strftime('%w','now','+3 hours') AS INTEGER)+6) % 7) * 86400) AS period_start,
    'W:' || date('now','+3 hours','-' || (((CAST(strftime('%w','now','+3 hours') AS INTEGER)+6) % 7)) || ' days') AS period_key
), active_players AS (
  SELECT p.season_id,p.telegram_id,
         MAX(s.starts_at,c.period_start) AS start_at,
         MIN(s.ends_at,c.period_start+604800) AS end_at,
         c.period_key,c.now_s
  FROM season_pass_players p
  JOIN season_pass_seasons s ON s.season_id=p.season_id
  CROSS JOIN clock c
  WHERE (s.manual_status='active' OR (COALESCE(s.manual_status,'')='' AND s.starts_at<=c.now_s AND s.ends_at>c.now_s))
)
INSERT OR IGNORE INTO season_pass_task_progress(
  season_id,telegram_id,period_key,period,runs,score,treats,coffee,cases_opened,initialized_at,updated_at
)
SELECT ap.season_id,ap.telegram_id,ap.period_key,'weekly',
  (SELECT COUNT(*) FROM season_pass_activity_runs r WHERE r.season_id=ap.season_id AND r.telegram_id=ap.telegram_id AND r.created_at>=ap.start_at AND r.created_at<ap.end_at),
  COALESCE((SELECT SUM(r.score) FROM season_pass_activity_runs r WHERE r.season_id=ap.season_id AND r.telegram_id=ap.telegram_id AND r.created_at>=ap.start_at AND r.created_at<ap.end_at),0),
  COALESCE((SELECT SUM(r.run_treats) FROM season_pass_activity_runs r WHERE r.season_id=ap.season_id AND r.telegram_id=ap.telegram_id AND r.created_at>=ap.start_at AND r.created_at<ap.end_at),0),
  COALESCE((SELECT SUM(r.run_coffee) FROM season_pass_activity_runs r WHERE r.season_id=ap.season_id AND r.telegram_id=ap.telegram_id AND r.created_at>=ap.start_at AND r.created_at<ap.end_at),0),
  (SELECT COUNT(*) FROM level_case_openings c WHERE c.telegram_id=ap.telegram_id AND c.opened_at>=ap.start_at AND c.opened_at<ap.end_at)
  + (SELECT COUNT(*) FROM granted_cases c WHERE c.telegram_id=ap.telegram_id AND c.status='opened' AND c.opened_at>=ap.start_at AND c.opened_at<ap.end_at)
  + (SELECT COUNT(*) FROM season_pass_case_grants c WHERE c.telegram_id=ap.telegram_id AND c.status='opened' AND c.opened_at>=ap.start_at AND c.opened_at<ap.end_at),
  ap.now_s,ap.now_s
FROM active_players ap
WHERE ap.end_at>ap.start_at;
