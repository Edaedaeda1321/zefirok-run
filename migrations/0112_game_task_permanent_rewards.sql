-- Task Hub: permanent section + max-level reward rebalance.
-- Reaching profile level 50 is the cap, so it must not award profile XP.
-- The final level milestone now grants a Legendary case, while the final
-- "Player Path" series reward remains a Mythic case without redundant XP.

UPDATE automation_chains
SET action_json='{"kind":"case","id":"legendary","amount":1,"profileXp":0,"reason":"Ветеран сезона"}',
    updated_at=unixepoch(),
    updated_by='migration-0112'
WHERE chain_key='task_once_level_50';

UPDATE task_series
SET final_reward_json='{"kind":"case","id":"mythic","amount":1,"profileXp":0,"reason":"Путь игрока"}',
    updated_at=unixepoch(),
    updated_by='migration-0112'
WHERE series_key='series_player_path';

-- Keep not-yet-claimed completion snapshots aligned with the new balance.
-- Already claimed rewards are immutable and are intentionally left untouched.
UPDATE player_task_claims
SET reward_json='{"kind":"case","id":"legendary","amount":1,"profileXp":0,"reason":"Ветеран сезона"}',
    updated_at=unixepoch()
WHERE chain_key='task_once_level_50' AND status<>'claimed';

UPDATE player_game_tasks
SET reward_json='{"kind":"case","id":"legendary","amount":1,"profileXp":0,"reason":"Ветеран сезона"}'
WHERE kind='task'
  AND task_key='task_once_level_50'
  AND NOT EXISTS (
    SELECT 1 FROM game_task_reward_claims g
    WHERE g.telegram_id=player_game_tasks.telegram_id
      AND g.kind='task'
      AND g.task_key=player_game_tasks.task_key
      AND g.cycle_key=player_game_tasks.cycle_key
      AND g.status='claimed'
  )
  AND NOT EXISTS (
    SELECT 1 FROM player_task_claims c
    WHERE c.telegram_id=player_game_tasks.telegram_id
      AND c.chain_key=player_game_tasks.task_key
      AND c.cycle_key=player_game_tasks.cycle_key
      AND c.status='claimed'
  );

UPDATE player_game_tasks
SET reward_json='{"kind":"case","id":"mythic","amount":1,"profileXp":0,"reason":"Путь игрока"}'
WHERE kind='series'
  AND task_key='series_player_path'
  AND NOT EXISTS (
    SELECT 1 FROM game_task_reward_claims g
    WHERE g.telegram_id=player_game_tasks.telegram_id
      AND g.kind='series'
      AND g.task_key=player_game_tasks.task_key
      AND g.cycle_key=player_game_tasks.cycle_key
      AND g.status='claimed'
  )
  AND NOT EXISTS (
    SELECT 1 FROM player_task_series_claims c
    WHERE c.telegram_id=player_game_tasks.telegram_id
      AND c.series_key=player_game_tasks.task_key
      AND c.cycle_key=player_game_tasks.cycle_key
      AND c.status='claimed'
  );
