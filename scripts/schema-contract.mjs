export const SCHEMA_CONTRACT_VERSION = 1;
export const SCHEMA_CONTRACT_MIGRATION = '0085_schema_contract_v1.sql';
export const D1_DATABASE_NAME = 'zefirok-rewards';
export const PREFLIGHT_STAMP_MAX_AGE_MS = 15 * 60 * 1000;

// Historical duplicate that is already part of Production migration history.
// New duplicate migration numbers are forbidden by check-migrations.mjs.
export const LEGACY_DUPLICATE_MIGRATION_GROUPS = Object.freeze({
  '0080': Object.freeze([
    '0080_poll_audience_segments.sql',
    '0080_run_session_skin_snapshot.sql'
  ])
});

// Tables that were historically CREATEd lazily by Worker code and are now
// canonically declared by migration 0085. This list is intentionally explicit:
// a new runtime CREATE TABLE must be accompanied by a migration + contract edit.
export const CANONICAL_RUNTIME_TABLES = Object.freeze([
  'game_run_live_proofs',
  'game_run_sessions',
  'game_run_settlement_guards',
  'game_runtime_config',
  'game_runtime_config_history',
  'granted_case_opening_guards',
  'owner_compensation_confirmation_words',
  'owner_media_assets',
  'owner_media_chunks',
  'owner_staging_change_set_locks',
  'owner_staging_change_sets',
  'owner_staging_items',
  'owner_staging_locks',
  'owner_staging_preferences',
  'owner_staging_release_requests',
  'owner_staging_releases',
  'player_economy_cutovers',
  'player_economy_meta',
  'player_economy_run_ledger',
  'player_gift_inbox',
  'player_news_reads',
  'promo_redemption_guards',
  'reward_delivery_effects',
  'reward_limit_guard_config',
  'season_end_reminder_deliveries',
  'season_pass_case_definitions',
  'season_pass_case_grants',
  'season_pass_case_items',
  'season_pass_case_opening_guards',
  'season_pass_case_presets',
  'season_pass_case_resource_items',
  'season_pass_story_events',
  'season_pass_story_manual_unlocks',
  'season_pass_story_presets',
  'season_pass_story_progress',
  'season_pass_story_tests',
  'season_pass_task_notifications',
  'season_pass_teaser_deliveries',
  'season_pass_teasers',
  'shop_assortment',
  'shop_featured_config',
  'shop_flash_offer_events',
  'shop_flash_offer_purchase_guards',
  'shop_flash_offer_purchases',
  'shop_flash_offers',
  'shop_stock_commit_guards'
]);

// Columns that older Production databases may already have because legacy
// Worker compatibility code added them after PRAGMA table_info checks.
// This is the single release-time contract for those compatibility columns.
export const REPAIRABLE_COMPATIBILITY_COLUMNS = Object.freeze([
  { table: 'admin_profile_state', column: 'pending_wallet', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'admin_profile_state', column: 'pending_treats', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'admin_profile_state', column: 'pending_coffee', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'case_player_state', column: 'owned_specials_json', definition: "TEXT NOT NULL DEFAULT '[]'" },
  { table: 'case_player_state', column: 'mythic_pity_counter', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'case_player_state', column: 'boosters_extra_json', definition: "TEXT NOT NULL DEFAULT '{}'" },
  { table: 'case_player_state', column: 'active_boosters_json', definition: "TEXT NOT NULL DEFAULT '{}'" },
  { table: 'game_run_sessions', column: 'booster_points', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'game_run_sessions', column: 'booster_treats', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'game_run_sessions', column: 'booster_coffee', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'game_run_sessions', column: 'booster_shield', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'game_run_sessions', column: 'booster_second_chance', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'game_run_sessions', column: 'booster_pause', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'game_run_sessions', column: 'shield_used', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'game_run_sessions', column: 'second_chance_used', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'game_run_sessions', column: 'skin_id', definition: "TEXT NOT NULL DEFAULT 'default'" },
  { table: 'case_booster_run_consumptions', column: 'booster_types_json', definition: "TEXT NOT NULL DEFAULT '[]'" },
  { table: 'player_economy_run_ledger', column: 'booster_types_json', definition: "TEXT NOT NULL DEFAULT '[]'" },
  { table: 'leaderboard_runs', column: 'run_treats', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'leaderboard_runs', column: 'run_coffee', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'leaderboard_entries', column: 'case_avatar_id', definition: "TEXT NOT NULL DEFAULT ''" },
  { table: 'leaderboard_entries', column: 'case_frame_id', definition: "TEXT NOT NULL DEFAULT ''" },
  { table: 'leaderboard_all_time', column: 'case_avatar_id', definition: "TEXT NOT NULL DEFAULT ''" },
  { table: 'leaderboard_all_time', column: 'case_frame_id', definition: "TEXT NOT NULL DEFAULT ''" },
  { table: 'season_pass_seasons', column: 'claim_grace_ends_at', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'granted_cases', column: 'opening_started_at', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'granted_cases', column: 'opening_token', definition: "TEXT NOT NULL DEFAULT ''" }
]);

// Critical columns beyond the legacy compatibility list. Presence is checked
// on every safe deploy. Type/default checks are applied where specified.
export const REQUIRED_COLUMN_SPECS = Object.freeze([
  ...REPAIRABLE_COMPATIBILITY_COLUMNS,
  { table: 'case_player_state', column: 'revision', definition: 'INTEGER NOT NULL DEFAULT 1' },
  { table: 'level_case_openings', column: 'telegram_id', definition: 'TEXT NOT NULL' },
  { table: 'level_case_openings', column: 'level', definition: 'INTEGER NOT NULL' },
  { table: 'level_case_openings', column: 'rewards_json', definition: "TEXT NOT NULL DEFAULT '[]'" },
  { table: 'game_run_sessions', column: 'run_id', definition: 'TEXT' },
  { table: 'game_run_sessions', column: 'telegram_id', definition: 'TEXT NOT NULL' },
  { table: 'game_run_sessions', column: 'status', definition: "TEXT NOT NULL DEFAULT 'started'" },
  { table: 'game_run_sessions', column: 'started_at_ms', definition: 'INTEGER NOT NULL' },
  { table: 'game_run_sessions', column: 'expires_at_ms', definition: 'INTEGER NOT NULL' },
  { table: 'game_run_live_proofs', column: 'run_id', definition: 'TEXT' },
  { table: 'game_run_live_proofs', column: 'seq', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'game_run_live_proofs', column: 'anchor_duration_ms', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'game_run_live_proofs', column: 'anchor_server_at_ms', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'player_economy_run_ledger', column: 'run_id', definition: 'TEXT' },
  { table: 'player_economy_run_ledger', column: 'telegram_id', definition: 'TEXT NOT NULL' },
  { table: 'player_economy_meta', column: 'meta_key', definition: 'TEXT' },
  { table: 'reward_delivery_queue', column: 'source_type', definition: 'TEXT NOT NULL' },
  { table: 'reward_delivery_queue', column: 'source_id', definition: "TEXT NOT NULL DEFAULT ''" },
  { table: 'reward_delivery_queue', column: 'status', definition: "TEXT NOT NULL DEFAULT 'pending'" },
  { table: 'reward_delivery_queue', column: 'lease_token', definition: "TEXT NOT NULL DEFAULT ''" },
  { table: 'reward_delivery_queue', column: 'lease_until', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'player_account_revision', column: 'telegram_id', definition: 'TEXT' },
  { table: 'player_account_revision', column: 'revision', definition: 'INTEGER NOT NULL DEFAULT 1' },
  { table: 'case_state_revision_guards', column: 'ok', definition: 'INTEGER NOT NULL' },
  { table: 'game_run_settlement_guards', column: 'ok', definition: 'INTEGER NOT NULL' },
  { table: 'granted_case_opening_guards', column: 'ok', definition: 'INTEGER NOT NULL' },
  { table: 'zefirok_schema_contract', column: 'contract_version', definition: 'INTEGER NOT NULL' },
  { table: 'zefirok_schema_contract', column: 'migration_name', definition: 'TEXT NOT NULL' }
]);

export const REQUIRED_INDEXES = Object.freeze([
  'idx_game_run_sessions_player',
  'idx_game_run_sessions_expiry',
  'idx_game_run_sessions_one_active_player',
  'idx_game_run_live_proofs_player',
  'idx_player_economy_runs_player',
  'idx_level_case_openings_player',
  'idx_player_account_revision_updated',
  'idx_reward_delivery_queue_pending',
  'idx_reward_delivery_queue_player',
  'idx_season_end_reminder_pending',
  'idx_player_gift_inbox_player',
  'idx_season_pass_task_notifications_player',
  'idx_season_pass_teaser_pending',
  'idx_season_pass_story_events_order',
  'idx_season_pass_story_progress_player',
  'idx_season_pass_story_manual_unlocks_player',
  'idx_season_pass_story_tests_player',
  'idx_season_pass_case_release',
  'idx_season_pass_case_items_enabled',
  'idx_season_pass_case_resource_items_enabled',
  'idx_season_pass_case_grants_player',
  'idx_game_runtime_history_created',
  'idx_owner_media_created',
  'idx_owner_media_chunks_asset',
  'idx_flash_offers_active',
  'idx_flash_offer_player_slot',
  'idx_flash_offer_purchases_player',
  'idx_flash_offer_events_offer',
  'idx_owner_staging_sets_owner',
  'idx_owner_staging_items_set',
  'idx_owner_staging_releases_set',
  'idx_owner_staging_release_requests_set',
  'idx_owner_staging_change_set_locks_owner',
  'idx_shop_stock_player_created_v76'
]);

export const REQUIRED_TRIGGERS = Object.freeze([
  'trg_account_revision_profile_insert',
  'trg_account_revision_profile_economy',
  'trg_account_revision_case_state_insert',
  'trg_account_revision_case_state_update',
  'trg_account_revision_granted_case_insert',
  'trg_account_revision_granted_case_update',
  'trg_account_revision_pass_insert',
  'trg_account_revision_pass_update'
]);

// SQL is compacted (lowercase + whitespace removed) before these fragments are checked.
export const REQUIRED_SQL_FRAGMENTS = Object.freeze([
  { type: 'table', name: 'case_state_revision_guards', fragments: ['check(ok=1)'] },
  { type: 'table', name: 'game_run_settlement_guards', fragments: ['check(ok=1)'] },
  { type: 'table', name: 'granted_case_opening_guards', fragments: ['check(ok=1)'] },
  { type: 'table', name: 'case_player_state', fragments: ['check(revision>=1)', 'check(active_booster_runs>=0andactive_booster_runs<=2)'] },
  { type: 'table', name: 'reward_delivery_queue', fragments: ['unique(source_type,source_id,telegram_id,reward_kind,reward_id)'] },
  { type: 'index', name: 'idx_game_run_sessions_one_active_player', fragments: ["uniqueindex", "where status='started'"] },
  { type: 'table', name: 'zefirok_schema_contract', fragments: ["check(contract_key='main')", 'check(contract_version>=1)'] }
]);

export const FORBIDDEN_PUBLIC_ASSET_PATTERNS = Object.freeze([
  /(?:^|\/)node_modules(?:\/|$)/i,
  /(?:^|\/)scripts(?:\/|$)/i,
  /(?:^|\/)src(?:\/|$)/i,
  /(?:^|\/)migrations(?:\/|$)/i,
  /(?:^|\/)[^/]*_test\.html$/i,
  /(?:^|\/)[^/]*_testing[^/]*\.html$/i,
  /(?:^|\/)[^/]*New_Version[^/]*\.html$/i,
  /(?:^|\/)(?:changes|menu_only|second-chance-layout|battle-pass_case_center_fix)\.(?:patch|diff)$/i,
  /(?:^|\/)worker\.js$/i,
  /(?:^|\/)wrangler\.jsonc$/i,
  /(?:^|\/)update\.sh$/i,
  /(?:^|\/)BASE_COMMIT\.txt$/i
]);
