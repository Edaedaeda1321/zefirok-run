-- Referral Program v2: timed reward boost, one-time friend return reward, lightweight profile summary.

ALTER TABLE referral_program_config ADD COLUMN boost_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE referral_program_config ADD COLUMN boost_multiplier INTEGER NOT NULL DEFAULT 2;
ALTER TABLE referral_program_config ADD COLUMN boost_starts_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE referral_program_config ADD COLUMN boost_ends_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE referral_program_config ADD COLUMN boost_title TEXT NOT NULL DEFAULT 'Реферальный праздник';
ALTER TABLE referral_program_config ADD COLUMN return_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE referral_program_config ADD COLUMN return_after_days INTEGER NOT NULL DEFAULT 14;
ALTER TABLE referral_program_config ADD COLUMN return_referrer_reward_json TEXT NOT NULL DEFAULT '{"kind":"points","amount":750}';
ALTER TABLE referral_program_config ADD COLUMN return_invitee_reward_json TEXT NOT NULL DEFAULT '{"kind":"booster","id":"points","amount":1}';

CREATE TABLE IF NOT EXISTS referral_return_progress (
  invitee_telegram_id TEXT PRIMARY KEY,
  referrer_telegram_id TEXT NOT NULL,
  previous_run_at INTEGER NOT NULL DEFAULT 0,
  returned_run_at INTEGER NOT NULL DEFAULT 0,
  rewarded_at INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_referral_return_rewarded ON referral_return_progress(rewarded_at DESC);
