CREATE TABLE IF NOT EXISTS player_polls (
  poll_id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','scheduled','active','ended','cancelled')),
  response_mode TEXT NOT NULL DEFAULT 'single' CHECK(response_mode IN ('single','multiple')),
  max_choices INTEGER NOT NULL DEFAULT 1 CHECK(max_choices >= 1 AND max_choices <= 10),
  audience_type TEXT NOT NULL DEFAULT 'all' CHECK(audience_type IN ('all','active_7d','testers','season','staff')),
  delivery_mode TEXT NOT NULL DEFAULT 'bot' CHECK(delivery_mode IN ('bot','game','both')),
  results_mode TEXT NOT NULL DEFAULT 'after_vote' CHECK(results_mode IN ('after_vote','after_end','hidden')),
  allow_change INTEGER NOT NULL DEFAULT 0 CHECK(allow_change IN (0,1)),
  show_in_tasks INTEGER NOT NULL DEFAULT 0 CHECK(show_in_tasks IN (0,1)),
  duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK(duration_seconds >= 0),
  starts_at INTEGER NOT NULL DEFAULT 0,
  ends_at INTEGER NOT NULL DEFAULT 0,
  reward_kind TEXT NOT NULL DEFAULT 'none',
  reward_id TEXT NOT NULL DEFAULT '',
  reward_amount INTEGER NOT NULL DEFAULT 0 CHECK(reward_amount >= 0),
  created_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL DEFAULT '',
  report_chat_id TEXT NOT NULL DEFAULT '',
  bot_queue_prepared INTEGER NOT NULL DEFAULT 0 CHECK(bot_queue_prepared IN (0,1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER NOT NULL DEFAULT 0,
  ended_at INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS player_poll_options (
  option_id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL,
  option_order INTEGER NOT NULL,
  option_text TEXT NOT NULL,
  UNIQUE(poll_id, option_order)
);

CREATE TABLE IF NOT EXISTS player_poll_responses (
  poll_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'bot' CHECK(source IN ('bot','game')),
  submitted_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  reward_queue_id INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(poll_id, telegram_id)
);

CREATE TABLE IF NOT EXISTS player_poll_votes (
  poll_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  option_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(poll_id, telegram_id, option_id)
);

CREATE TABLE IF NOT EXISTS player_poll_bot_deliveries (
  poll_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','failed','skipped')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT NOT NULL DEFAULT '',
  available_at INTEGER NOT NULL DEFAULT 0,
  delivered_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(poll_id, telegram_id)
);

CREATE TABLE IF NOT EXISTS player_poll_game_deliveries (
  poll_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  shown_count INTEGER NOT NULL DEFAULT 0,
  last_shown_at INTEGER NOT NULL DEFAULT 0,
  snoozed_until INTEGER NOT NULL DEFAULT 0,
  answered_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(poll_id, telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_player_polls_status_schedule ON player_polls(status, starts_at, ends_at, updated_at);
CREATE INDEX IF NOT EXISTS idx_player_poll_responses_poll ON player_poll_responses(poll_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_player_poll_votes_option ON player_poll_votes(poll_id, option_id);
CREATE INDEX IF NOT EXISTS idx_player_poll_bot_queue ON player_poll_bot_deliveries(status, available_at, updated_at);
CREATE INDEX IF NOT EXISTS idx_player_poll_game_due ON player_poll_game_deliveries(telegram_id, snoozed_until, answered_at);
