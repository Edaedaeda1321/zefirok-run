-- v0.57: история игроков, точные права, технические работы,
-- тестеры, промокоды, уведомления, снимки и аналитика контента.

CREATE TABLE IF NOT EXISTS player_timeline_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  source_id TEXT NOT NULL DEFAULT '',
  actor_telegram_id TEXT NOT NULL DEFAULT '',
  actor_name TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  UNIQUE(telegram_id, event_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_player_timeline_recent
ON player_timeline_events(telegram_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS staff_permission_overrides (
  telegram_id TEXT PRIMARY KEY,
  view_players INTEGER NOT NULL DEFAULT 1 CHECK(view_players IN (0,1)),
  grant_rewards INTEGER NOT NULL DEFAULT 0 CHECK(grant_rewards IN (0,1)),
  grant_legendary_cases INTEGER NOT NULL DEFAULT 0 CHECK(grant_legendary_cases IN (0,1)),
  block_players INTEGER NOT NULL DEFAULT 0 CHECK(block_players IN (0,1)),
  unblock_players INTEGER NOT NULL DEFAULT 0 CHECK(unblock_players IN (0,1)),
  redeem_physical INTEGER NOT NULL DEFAULT 0 CHECK(redeem_physical IN (0,1)),
  manage_seasons INTEGER NOT NULL DEFAULT 0 CHECK(manage_seasons IN (0,1)),
  manage_cases INTEGER NOT NULL DEFAULT 0 CHECK(manage_cases IN (0,1)),
  manage_shop INTEGER NOT NULL DEFAULT 0 CHECK(manage_shop IN (0,1)),
  mass_broadcasts INTEGER NOT NULL DEFAULT 0 CHECK(mass_broadcasts IN (0,1)),
  view_economy INTEGER NOT NULL DEFAULT 0 CHECK(view_economy IN (0,1)),
  rollback_settings INTEGER NOT NULL DEFAULT 0 CHECK(rollback_settings IN (0,1)),
  manage_maintenance INTEGER NOT NULL DEFAULT 0 CHECK(manage_maintenance IN (0,1)),
  manage_testers INTEGER NOT NULL DEFAULT 0 CHECK(manage_testers IN (0,1)),
  manage_promocodes INTEGER NOT NULL DEFAULT 0 CHECK(manage_promocodes IN (0,1)),
  view_content_analytics INTEGER NOT NULL DEFAULT 0 CHECK(view_content_analytics IN (0,1)),
  approve_dangerous INTEGER NOT NULL DEFAULT 0 CHECK(approve_dangerous IN (0,1)),
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS dangerous_action_approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  requested_by TEXT NOT NULL,
  requested_by_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','expired','executed','failed')),
  required_approvals INTEGER NOT NULL DEFAULT 1 CHECK(required_approvals >= 1),
  approvals_json TEXT NOT NULL DEFAULT '[]',
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  executed_at INTEGER NOT NULL DEFAULT 0,
  error_text TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_dangerous_approvals_pending
ON dangerous_action_approvals(status, expires_at, created_at DESC);

CREATE TABLE IF NOT EXISTS maintenance_settings (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  full_closed INTEGER NOT NULL DEFAULT 0 CHECK(full_closed IN (0,1)),
  rating_disabled INTEGER NOT NULL DEFAULT 0 CHECK(rating_disabled IN (0,1)),
  purchases_disabled INTEGER NOT NULL DEFAULT 0 CHECK(purchases_disabled IN (0,1)),
  cases_disabled INTEGER NOT NULL DEFAULT 0 CHECK(cases_disabled IN (0,1)),
  physical_rewards_disabled INTEGER NOT NULL DEFAULT 0 CHECK(physical_rewards_disabled IN (0,1)),
  testers_only INTEGER NOT NULL DEFAULT 0 CHECK(testers_only IN (0,1)),
  message TEXT NOT NULL DEFAULT 'В игре проходят технические работы. Прогресс сохранён. Попробуйте снова через несколько минут.',
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);

INSERT OR IGNORE INTO maintenance_settings(id, updated_at, updated_by)
VALUES (1, unixepoch(), 'migration');

CREATE TABLE IF NOT EXISTS tester_accounts (
  telegram_id TEXT PRIMARY KEY,
  test_balance_enabled INTEGER NOT NULL DEFAULT 0 CHECK(test_balance_enabled IN (0,1)),
  unlock_all_skins INTEGER NOT NULL DEFAULT 0 CHECK(unlock_all_skins IN (0,1)),
  unlock_all_cases INTEGER NOT NULL DEFAULT 0 CHECK(unlock_all_cases IN (0,1)),
  accelerated_guarantee INTEGER NOT NULL DEFAULT 0 CHECK(accelerated_guarantee IN (0,1)),
  exclude_from_rating INTEGER NOT NULL DEFAULT 1 CHECK(exclude_from_rating IN (0,1)),
  note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_testers_updated
ON tester_accounts(updated_at DESC);

CREATE TABLE IF NOT EXISTS promo_codes (
  code TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  reward_json TEXT NOT NULL DEFAULT '[]',
  max_redemptions INTEGER NOT NULL DEFAULT 0 CHECK(max_redemptions >= 0),
  per_player_limit INTEGER NOT NULL DEFAULT 1 CHECK(per_player_limit >= 1),
  redemption_count INTEGER NOT NULL DEFAULT 0 CHECK(redemption_count >= 0),
  starts_at INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  created_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_active
ON promo_codes(enabled, starts_at, expires_at);

CREATE TABLE IF NOT EXISTS promo_redemptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  reward_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','delivered','failed','cancelled')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(code, telegram_id)
);

CREATE INDEX IF NOT EXISTS idx_promo_redemptions_code
ON promo_redemptions(code, created_at DESC);

CREATE TABLE IF NOT EXISTS staff_notification_preferences (
  telegram_id TEXT PRIMARY KEY,
  rating_finished INTEGER NOT NULL DEFAULT 1 CHECK(rating_finished IN (0,1)),
  physical_reward INTEGER NOT NULL DEFAULT 1 CHECK(physical_reward IN (0,1)),
  low_stock INTEGER NOT NULL DEFAULT 1 CHECK(low_stock IN (0,1)),
  bot_errors INTEGER NOT NULL DEFAULT 1 CHECK(bot_errors IN (0,1)),
  new_tickets INTEGER NOT NULL DEFAULT 1 CHECK(new_tickets IN (0,1)),
  suspicious_runs INTEGER NOT NULL DEFAULT 1 CHECK(suspicious_runs IN (0,1)),
  mass_grants INTEGER NOT NULL DEFAULT 1 CHECK(mass_grants IN (0,1)),
  case_changes INTEGER NOT NULL DEFAULT 1 CHECK(case_changes IN (0,1)),
  player_blocks INTEGER NOT NULL DEFAULT 1 CHECK(player_blocks IN (0,1)),
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS config_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  snapshot_type TEXT NOT NULL DEFAULT 'manual',
  title TEXT NOT NULL,
  data_json TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  restored_at INTEGER NOT NULL DEFAULT 0,
  restored_by TEXT NOT NULL DEFAULT '',
  restore_status TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_config_snapshots_recent
ON config_snapshots(created_at DESC);

CREATE TABLE IF NOT EXISTS content_analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT NOT NULL,
  item_kind TEXT NOT NULL CHECK(item_kind IN ('avatar','frame','trail','skin')),
  item_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('acquired','duplicate','equipped')),
  source_type TEXT NOT NULL DEFAULT '',
  source_id TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  UNIQUE(telegram_id, item_kind, item_id, event_type, source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_content_analytics_item
ON content_analytics_events(item_kind, item_id, event_type, created_at DESC);
