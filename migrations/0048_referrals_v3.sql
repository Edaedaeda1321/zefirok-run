-- Referral Program v3: social feed, free friend gift, weekly shared gift, and large reward choice.

ALTER TABLE referral_program_config ADD COLUMN friend_gift_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE referral_program_config ADD COLUMN friend_gift_cooldown_hours INTEGER NOT NULL DEFAULT 72;
ALTER TABLE referral_program_config ADD COLUMN friend_gift_reward_json TEXT NOT NULL DEFAULT '{"kind":"booster","id":"points","amount":1}';
ALTER TABLE referral_program_config ADD COLUMN weekly_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE referral_program_config ADD COLUMN weekly_runs_each INTEGER NOT NULL DEFAULT 3;
ALTER TABLE referral_program_config ADD COLUMN weekly_referrer_reward_json TEXT NOT NULL DEFAULT '{"kind":"case","id":"small","amount":1}';
ALTER TABLE referral_program_config ADD COLUMN weekly_invitee_reward_json TEXT NOT NULL DEFAULT '{"kind":"case","id":"small","amount":1}';

ALTER TABLE referral_network_milestones ADD COLUMN choice_rewards_json TEXT NOT NULL DEFAULT '[]';

CREATE TABLE IF NOT EXISTS referral_friend_gifts (
  gift_id TEXT PRIMARY KEY,
  sender_telegram_id TEXT NOT NULL,
  recipient_telegram_id TEXT NOT NULL,
  reward_json TEXT NOT NULL,
  reward_id TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_referral_friend_gifts_sender ON referral_friend_gifts(sender_telegram_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_friend_gifts_recipient ON referral_friend_gifts(recipient_telegram_id,created_at DESC);

-- Compare-and-set cooldown guard: prevents two simultaneous gift requests from bypassing the sender cooldown.
CREATE TABLE IF NOT EXISTS referral_friend_gift_cooldowns (
  sender_telegram_id TEXT PRIMARY KEY,
  next_gift_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0
);

-- One shared box per referrer per Moscow week. The partner that completes it first is fixed for that week.
CREATE TABLE IF NOT EXISTS referral_weekly_progress (
  referrer_telegram_id TEXT NOT NULL,
  week_key TEXT NOT NULL,
  invitee_telegram_id TEXT NOT NULL,
  referrer_runs INTEGER NOT NULL DEFAULT 0,
  invitee_runs INTEGER NOT NULL DEFAULT 0,
  achieved_at INTEGER NOT NULL,
  PRIMARY KEY(referrer_telegram_id,week_key)
);
CREATE INDEX IF NOT EXISTS idx_referral_weekly_invitee ON referral_weekly_progress(invitee_telegram_id,week_key,achieved_at DESC);

CREATE TABLE IF NOT EXISTS referral_reward_choices (
  referrer_telegram_id TEXT NOT NULL,
  threshold INTEGER NOT NULL,
  options_json TEXT NOT NULL DEFAULT '[]',
  selected_index INTEGER NOT NULL DEFAULT -1,
  selected_reward_json TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  selected_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(referrer_telegram_id,threshold)
);
CREATE INDEX IF NOT EXISTS idx_referral_reward_choices_pending ON referral_reward_choices(referrer_telegram_id,selected_at,created_at DESC);

-- Preserve the old fixed reward as one of the options so v3 never makes an existing milestone worse.
UPDATE referral_network_milestones
SET choice_rewards_json='[{"kind":"case","id":"gold","amount":1},{"kind":"points","amount":6000},{"kind":"booster","id":"points","amount":3}]'
WHERE threshold=10 AND (choice_rewards_json IS NULL OR choice_rewards_json='[]');

UPDATE referral_network_milestones
SET choice_rewards_json='[{"kind":"case","id":"gold","amount":2},{"kind":"case","id":"mythic","amount":1},{"kind":"points","amount":12000}]'
WHERE threshold=20 AND (choice_rewards_json IS NULL OR choice_rewards_json='[]');

UPDATE referral_network_milestones
SET choice_rewards_json='[{"kind":"case","id":"legendary","amount":1},{"kind":"case","id":"mythic","amount":2},{"kind":"points","amount":30000}]'
WHERE threshold=50 AND (choice_rewards_json IS NULL OR choice_rewards_json='[]');
