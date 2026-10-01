-- Player directory integrity + rating recovery backfill.
--
-- A protected run can survive while startup/profile sync fails, and the rating
-- recovery path may then restore leaderboard state from server-side proofs.
-- Control Center historically anchored its player directory on
-- admin_profile_state, so those valid rating-only players became invisible.
-- Materialize only missing authoritative profile shells; never overwrite
-- wallet/treats/coffee/XP for existing accounts.

INSERT OR IGNORE INTO admin_profile_state (
  telegram_id,wallet,best_score,treats,coffee,profile_xp,
  revision,created_at,updated_at,updated_by
)
SELECT
  a.telegram_id,0,MAX(0,COALESCE(a.best_score,0)),0,0,0,
  1,
  CASE WHEN COALESCE(a.achieved_at,0)>0 THEN a.achieved_at ELSE unixepoch() END,
  CASE WHEN COALESCE(a.updated_at,0)>0 THEN a.updated_at ELSE unixepoch() END,
  'migration:0110:leaderboard_all_time'
FROM leaderboard_all_time a
WHERE COALESCE(a.telegram_id,'')<>'' AND COALESCE(a.hidden,0)=0;

INSERT OR IGNORE INTO admin_profile_state (
  telegram_id,wallet,best_score,treats,coffee,profile_xp,
  revision,created_at,updated_at,updated_by
)
SELECT
  e.telegram_id,0,MAX(CASE WHEN COALESCE(e.best_score,0)>0 THEN e.best_score ELSE 0 END),0,0,0,
  1,
  CASE WHEN MIN(COALESCE(e.achieved_at,0))>0 THEN MIN(e.achieved_at) ELSE unixepoch() END,
  CASE WHEN MAX(COALESCE(e.updated_at,0))>0 THEN MAX(e.updated_at) ELSE unixepoch() END,
  'migration:0110:leaderboard_entries'
FROM leaderboard_entries e
WHERE COALESCE(e.telegram_id,'')<>'' AND COALESCE(e.hidden,0)=0
GROUP BY e.telegram_id;
