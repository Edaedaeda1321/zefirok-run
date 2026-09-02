-- Battle Pass task-completion notifications belong to Telegram + in-game push,
-- not to the durable Player Mail V3 inbox. Remove letters created by the
-- short-lived Mail V3 integration without touching the authoritative task
-- notification/claim state.

DELETE FROM player_mail_rewards_v3
WHERE EXISTS (
  SELECT 1
  FROM player_mail_v3
  WHERE player_mail_v3.mail_id = player_mail_rewards_v3.mail_id
    AND player_mail_v3.telegram_id = player_mail_rewards_v3.telegram_id
    AND (
      player_mail_v3.source_type = 'season_pass_task'
      OR player_mail_v3.mail_kind = 'season_pass_task'
    )
);

DELETE FROM player_mail_v3
WHERE source_type = 'season_pass_task'
   OR mail_kind = 'season_pass_task';
