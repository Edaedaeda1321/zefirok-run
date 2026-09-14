-- v0.91: Stage the runner-case balance policy for the new Worker.
-- Old Workers ignore this non-main marker, avoiding a window where the new
-- 50% drop rate could activate before the server-side 1000-score gate exists.
-- The new Worker consumes this marker atomically on its first case-drop config read.
INSERT INTO game_case_drop_settings(
  config_id,enabled,chance_bps,
  weight_small,weight_sweet,weight_gold,weight_mythic,weight_legendary,
  spawn_min_ms,spawn_max_ms,updated_at
) VALUES ('runner_case_drop_policy_v2_20260914',1,5000,9000,500,250,200,50,1000,1000,unixepoch())
ON CONFLICT(config_id) DO UPDATE SET
  enabled=excluded.enabled,
  chance_bps=excluded.chance_bps,
  weight_small=excluded.weight_small,
  weight_sweet=excluded.weight_sweet,
  weight_gold=excluded.weight_gold,
  weight_mythic=excluded.weight_mythic,
  weight_legendary=excluded.weight_legendary,
  spawn_min_ms=excluded.spawn_min_ms,
  spawn_max_ms=excluded.spawn_max_ms,
  updated_at=excluded.updated_at;
