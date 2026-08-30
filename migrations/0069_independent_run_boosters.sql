-- Independent consumable boosters + one-run Shield / Second Chance.
-- Schema compatibility for the new booster columns is owned by the Worker's
-- ensureRuntimeCompatibilitySchema(). This migration only backfills the
-- historical single active booster into the authoritative multi-booster JSON.
--
-- Keeping DDL out of this migration is intentional: production may already
-- have the compatibility columns after the new Worker has served a request.

UPDATE case_player_state
SET active_boosters_json = json_object(
  'points', CASE
    WHEN active_booster_type = 'points'
      THEN CASE WHEN active_booster_runs < 0 THEN 0 WHEN active_booster_runs > 2 THEN 2 ELSE active_booster_runs END
    ELSE 0
  END,
  'treats', CASE
    WHEN active_booster_type = 'treats'
      THEN CASE WHEN active_booster_runs < 0 THEN 0 WHEN active_booster_runs > 2 THEN 2 ELSE active_booster_runs END
    ELSE 0
  END,
  'coffee', CASE
    WHEN active_booster_type = 'coffee'
      THEN CASE WHEN active_booster_runs < 0 THEN 0 WHEN active_booster_runs > 2 THEN 2 ELSE active_booster_runs END
    ELSE 0
  END,
  'shield', 0,
  'second_chance', 0
)
WHERE active_boosters_json = '{}' OR active_boosters_json = '';
