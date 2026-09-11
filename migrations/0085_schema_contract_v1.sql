-- Schema contract v1: canonicalizes tables that historically existed only because
-- Worker runtime compatibility code created them lazily. All CREATE statements are
-- idempotent for already-running Production databases. Existing legacy columns that
-- were added through PRAGMA + ALTER TABLE are verified/repaired by the release
-- preflight because SQLite/D1 has no safe ADD COLUMN IF NOT EXISTS.

-- Canonical table: game_run_live_proofs
CREATE TABLE IF NOT EXISTS game_run_live_proofs (
          run_id TEXT PRIMARY KEY,
          telegram_id TEXT NOT NULL,
          seq INTEGER NOT NULL DEFAULT 0,
          duration_ms INTEGER NOT NULL DEFAULT 0,
          score INTEGER NOT NULL DEFAULT 0,
          run_treats INTEGER NOT NULL DEFAULT 0,
          run_coffee INTEGER NOT NULL DEFAULT 0,
          last_server_at_ms INTEGER NOT NULL,
          anchor_duration_ms INTEGER NOT NULL DEFAULT 0,
          anchor_server_at_ms INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

-- Canonical table: game_run_sessions
CREATE TABLE IF NOT EXISTS game_run_sessions (
          run_id TEXT PRIMARY KEY,
          telegram_id TEXT NOT NULL,
          started_at_ms INTEGER NOT NULL,
          expires_at_ms INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'started',
          skin_id TEXT NOT NULL DEFAULT 'default',
          finished_at_ms INTEGER NOT NULL DEFAULT 0,
          duration_ms INTEGER NOT NULL DEFAULT 0,
          score INTEGER NOT NULL DEFAULT 0,
          run_treats INTEGER NOT NULL DEFAULT 0,
          run_coffee INTEGER NOT NULL DEFAULT 0,
          booster_points INTEGER NOT NULL DEFAULT 0,
          booster_treats INTEGER NOT NULL DEFAULT 0,
          booster_coffee INTEGER NOT NULL DEFAULT 0,
          booster_shield INTEGER NOT NULL DEFAULT 0,
          booster_second_chance INTEGER NOT NULL DEFAULT 0,
          booster_pause INTEGER NOT NULL DEFAULT 0,
          shield_used INTEGER NOT NULL DEFAULT 0,
          second_chance_used INTEGER NOT NULL DEFAULT 0,
          economy_points INTEGER NOT NULL DEFAULT 0,
          economy_treats INTEGER NOT NULL DEFAULT 0,
          economy_coffee INTEGER NOT NULL DEFAULT 0,
          profile_xp INTEGER NOT NULL DEFAULT 0,
          new_record INTEGER NOT NULL DEFAULT 0,
          accepted_rating INTEGER NOT NULL DEFAULT 0,
          season_id TEXT NOT NULL DEFAULT '',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

-- Canonical table: game_run_settlement_guards
CREATE TABLE IF NOT EXISTS game_run_settlement_guards (
          guard_id TEXT PRIMARY KEY,
          ok INTEGER NOT NULL CONSTRAINT game_run_settlement_guard_ok CHECK(ok=1)
        );

-- Canonical table: game_runtime_config
CREATE TABLE IF NOT EXISTS game_runtime_config(id INTEGER PRIMARY KEY CHECK(id=1),draft_json TEXT NOT NULL DEFAULT '{}',published_json TEXT NOT NULL DEFAULT '{}',version INTEGER NOT NULL DEFAULT 1,updated_at INTEGER NOT NULL DEFAULT 0,published_at INTEGER NOT NULL DEFAULT 0,updated_by TEXT NOT NULL DEFAULT '',published_by TEXT NOT NULL DEFAULT '');

-- Canonical table: game_runtime_config_history
CREATE TABLE IF NOT EXISTS game_runtime_config_history(id INTEGER PRIMARY KEY AUTOINCREMENT,version INTEGER NOT NULL,config_json TEXT NOT NULL,reason TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL,created_by TEXT NOT NULL DEFAULT '',created_by_name TEXT NOT NULL DEFAULT '');

-- Canonical table: granted_case_opening_guards
CREATE TABLE IF NOT EXISTS granted_case_opening_guards (
          guard_id TEXT PRIMARY KEY,
          ok INTEGER NOT NULL CONSTRAINT granted_case_opening_guard_ok CHECK(ok=1)
        );

-- Canonical table: owner_compensation_confirmation_words
CREATE TABLE IF NOT EXISTS owner_compensation_confirmation_words (
      owner_telegram_id TEXT PRIMARY KEY,
      word_salt TEXT NOT NULL,
      word_hash TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      updated_by TEXT NOT NULL DEFAULT ''
    );

-- Canonical table: owner_media_assets
CREATE TABLE IF NOT EXISTS owner_media_assets(asset_id TEXT PRIMARY KEY,file_name TEXT NOT NULL,content_type TEXT NOT NULL,byte_size INTEGER NOT NULL,chunk_count INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,created_by TEXT NOT NULL DEFAULT '',created_by_name TEXT NOT NULL DEFAULT '',deleted_at INTEGER NOT NULL DEFAULT 0);

-- Canonical table: owner_media_chunks
CREATE TABLE IF NOT EXISTS owner_media_chunks(asset_id TEXT NOT NULL,chunk_index INTEGER NOT NULL,data BLOB NOT NULL,PRIMARY KEY(asset_id,chunk_index));

-- Canonical table: owner_staging_change_set_locks
CREATE TABLE IF NOT EXISTS owner_staging_change_set_locks (
          change_set_id TEXT PRIMARY KEY,owner_telegram_id TEXT NOT NULL,lock_token TEXT NOT NULL,lock_kind TEXT NOT NULL,release_token TEXT NOT NULL DEFAULT '',acquired_at INTEGER NOT NULL,expires_at INTEGER NOT NULL
        );

-- Canonical table: owner_staging_change_sets
CREATE TABLE IF NOT EXISTS owner_staging_change_sets (
          change_set_id TEXT PRIMARY KEY,title TEXT NOT NULL,note TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'sandbox',
          owner_telegram_id TEXT NOT NULL,base_captured_at INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,
          ready_at INTEGER NOT NULL DEFAULT 0,published_at INTEGER NOT NULL DEFAULT 0
        );

-- Canonical table: owner_staging_items
CREATE TABLE IF NOT EXISTS owner_staging_items (
          item_id TEXT PRIMARY KEY,change_set_id TEXT NOT NULL,item_key TEXT NOT NULL,kind TEXT NOT NULL,title TEXT NOT NULL,
          endpoint TEXT NOT NULL,payload_json TEXT NOT NULL DEFAULT '{}',before_json TEXT NOT NULL DEFAULT '{}',after_json TEXT NOT NULL DEFAULT '{}',
          tp_kind TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'sandbox',created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,
          published_at INTEGER NOT NULL DEFAULT 0,rolled_back_at INTEGER NOT NULL DEFAULT 0,release_id TEXT NOT NULL DEFAULT '',
          UNIQUE(change_set_id,item_key)
        );

-- Canonical table: owner_staging_locks
CREATE TABLE IF NOT EXISTS owner_staging_locks (
          owner_telegram_id TEXT PRIMARY KEY,change_set_id TEXT NOT NULL,lock_token TEXT NOT NULL,lock_kind TEXT NOT NULL,acquired_at INTEGER NOT NULL,expires_at INTEGER NOT NULL
        );

-- Canonical table: owner_staging_preferences
CREATE TABLE IF NOT EXISTS owner_staging_preferences (
          owner_telegram_id TEXT PRIMARY KEY,active_change_set_id TEXT NOT NULL DEFAULT '',staging_enabled INTEGER NOT NULL DEFAULT 0,updated_at INTEGER NOT NULL DEFAULT 0
        );

-- Canonical table: owner_staging_release_requests
CREATE TABLE IF NOT EXISTS owner_staging_release_requests (
          request_key TEXT PRIMARY KEY,change_set_id TEXT NOT NULL,owner_telegram_id TEXT NOT NULL,operation_kind TEXT NOT NULL,release_token TEXT NOT NULL,request_fingerprint TEXT NOT NULL DEFAULT '',claim_token TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'in_progress',release_id TEXT NOT NULL DEFAULT '',result_json TEXT NOT NULL DEFAULT '{}',error_text TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,expires_at INTEGER NOT NULL
        );

-- Canonical table: owner_staging_releases
CREATE TABLE IF NOT EXISTS owner_staging_releases (
          release_id TEXT PRIMARY KEY,change_set_id TEXT NOT NULL,item_ids_json TEXT NOT NULL DEFAULT '[]',status TEXT NOT NULL DEFAULT 'completed',
          gate_json TEXT NOT NULL DEFAULT '{}',note TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL,created_by TEXT NOT NULL,created_by_name TEXT NOT NULL DEFAULT ''
        );

-- Canonical table: player_economy_cutovers
CREATE TABLE IF NOT EXISTS player_economy_cutovers (
          telegram_id TEXT PRIMARY KEY,
          recovery_token TEXT NOT NULL,
          source_updated_at INTEGER NOT NULL DEFAULT 0,
          recovered_runs INTEGER NOT NULL DEFAULT 0,
          recovered_points INTEGER NOT NULL DEFAULT 0,
          recovered_treats INTEGER NOT NULL DEFAULT 0,
          recovered_coffee INTEGER NOT NULL DEFAULT 0,
          recovered_profile_xp INTEGER NOT NULL DEFAULT 0,
          recovered_at INTEGER NOT NULL
        );

-- Canonical table: player_economy_meta
CREATE TABLE IF NOT EXISTS player_economy_meta (
          meta_key TEXT PRIMARY KEY,
          value_int INTEGER NOT NULL DEFAULT 0,
          updated_at INTEGER NOT NULL DEFAULT 0
        );

-- Canonical table: player_economy_run_ledger
CREATE TABLE IF NOT EXISTS player_economy_run_ledger (
          run_id TEXT PRIMARY KEY,
          telegram_id TEXT NOT NULL,
          points INTEGER NOT NULL DEFAULT 0,
          treats INTEGER NOT NULL DEFAULT 0,
          coffee INTEGER NOT NULL DEFAULT 0,
          profile_xp INTEGER NOT NULL DEFAULT 0,
          raw_score INTEGER NOT NULL DEFAULT 0,
          raw_treats INTEGER NOT NULL DEFAULT 0,
          raw_coffee INTEGER NOT NULL DEFAULT 0,
          duration_ms INTEGER NOT NULL DEFAULT 0,
          booster_type TEXT NOT NULL DEFAULT '',
          booster_types_json TEXT NOT NULL DEFAULT '[]',
          skin_id TEXT NOT NULL DEFAULT 'default',
          new_record INTEGER NOT NULL DEFAULT 0,
          accepted_rating INTEGER NOT NULL DEFAULT 0,
          season_id TEXT NOT NULL DEFAULT '',
          created_at INTEGER NOT NULL
        );

-- Canonical table: player_gift_inbox
CREATE TABLE IF NOT EXISTS player_gift_inbox (
        gift_id TEXT NOT NULL,
        telegram_id TEXT NOT NULL,
        gift_kind TEXT NOT NULL DEFAULT 'gift',
        title TEXT NOT NULL DEFAULT '',
        message_text TEXT NOT NULL DEFAULT '',
        reason TEXT NOT NULL DEFAULT '',
        rewards_json TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'pending',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        claimed_at INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(gift_id, telegram_id)
      );

-- Canonical table: player_news_reads
CREATE TABLE IF NOT EXISTS player_news_reads (
        telegram_id TEXT PRIMARY KEY,
        last_news_id INTEGER NOT NULL DEFAULT 0,
        read_at INTEGER NOT NULL DEFAULT 0
      );

-- Canonical table: promo_redemption_guards
CREATE TABLE IF NOT EXISTS promo_redemption_guards (guard_id TEXT PRIMARY KEY,ok INTEGER NOT NULL CONSTRAINT promo_redemption_guard_ok CHECK(ok=1));

-- Canonical table: reward_delivery_effects
CREATE TABLE IF NOT EXISTS reward_delivery_effects (
          queue_id INTEGER PRIMARY KEY, telegram_id TEXT NOT NULL, reward_kind TEXT NOT NULL,
          reward_id TEXT NOT NULL DEFAULT '', apply_token TEXT NOT NULL, applied_at INTEGER NOT NULL);

-- Canonical table: reward_limit_guard_config
CREATE TABLE IF NOT EXISTS reward_limit_guard_config (
        id INTEGER PRIMARY KEY CHECK(id=1),
        max_count INTEGER NOT NULL DEFAULT 2,
        window_seconds INTEGER NOT NULL DEFAULT 86400,
        reset_at INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL DEFAULT 0
      );

-- Canonical table: season_end_reminder_deliveries
CREATE TABLE IF NOT EXISTS season_end_reminder_deliveries(
        season_key TEXT NOT NULL,reminder_key TEXT NOT NULL,telegram_id TEXT NOT NULL,chat_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',queue_id INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,
        PRIMARY KEY(season_key,reminder_key,telegram_id));

-- Canonical table: season_pass_case_definitions
CREATE TABLE IF NOT EXISTS season_pass_case_definitions (
        case_id TEXT PRIMARY KEY, season_id TEXT NOT NULL UNIQUE, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
        closed_image_url TEXT NOT NULL DEFAULT '', open_image_url TEXT NOT NULL DEFAULT '', slots INTEGER NOT NULL DEFAULT 1 CHECK(slots BETWEEN 1 AND 5),
        duplicate_points INTEGER NOT NULL DEFAULT 5000 CHECK(duplicate_points>=0), enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
        reward_groups_json TEXT NOT NULL DEFAULT '{}',
        release_at INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL, updated_by TEXT NOT NULL DEFAULT ''
      );

-- Canonical table: season_pass_case_grants
CREATE TABLE IF NOT EXISTS season_pass_case_grants (
        grant_id TEXT PRIMARY KEY, case_id TEXT NOT NULL, source_season_id TEXT NOT NULL DEFAULT '', telegram_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','opening','opened')), rewards_json TEXT NOT NULL DEFAULT '[]', snapshot_json TEXT NOT NULL DEFAULT '{}',
        opening_started_at INTEGER NOT NULL DEFAULT 0, opening_token TEXT NOT NULL DEFAULT '', granted_by TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, opened_at INTEGER NOT NULL DEFAULT 0
      );

-- Canonical table: season_pass_case_items
CREATE TABLE IF NOT EXISTS season_pass_case_items (
        case_id TEXT NOT NULL, item_key TEXT NOT NULL, reward_kind TEXT NOT NULL CHECK(reward_kind IN ('avatar','frame','trail','skin','music')),
        item_id TEXT NOT NULL, weight REAL NOT NULL DEFAULT 1 CHECK(weight>0), rarity TEXT NOT NULL DEFAULT 'seasonal', title TEXT NOT NULL DEFAULT '', image_url TEXT NOT NULL DEFAULT '', enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
        PRIMARY KEY(case_id,item_key)
      );

-- Canonical table: season_pass_case_opening_guards
CREATE TABLE IF NOT EXISTS season_pass_case_opening_guards (guard_id TEXT PRIMARY KEY,ok INTEGER NOT NULL CONSTRAINT season_pass_case_opening_guard_ok CHECK(ok=1));

-- Canonical table: season_pass_case_presets
CREATE TABLE IF NOT EXISTS season_pass_case_presets (preset_id TEXT PRIMARY KEY,season_id TEXT NOT NULL,seeded_at INTEGER NOT NULL,updated_by TEXT NOT NULL DEFAULT '');

-- Canonical table: season_pass_case_resource_items
CREATE TABLE IF NOT EXISTS season_pass_case_resource_items (
        case_id TEXT NOT NULL, item_key TEXT NOT NULL, reward_kind TEXT NOT NULL CHECK(reward_kind IN ('points','treats','coffee','case')),
        item_id TEXT NOT NULL DEFAULT '', amount INTEGER NOT NULL DEFAULT 1 CHECK(amount>0), weight REAL NOT NULL DEFAULT 1 CHECK(weight>0), rarity TEXT NOT NULL DEFAULT 'resource', title TEXT NOT NULL DEFAULT '', image_url TEXT NOT NULL DEFAULT '', enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
        PRIMARY KEY(case_id,item_key)
      );

-- Canonical table: season_pass_story_events
CREATE TABLE IF NOT EXISTS season_pass_story_events (
        event_id TEXT PRIMARY KEY, season_id TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0,
        unlock_level INTEGER NOT NULL DEFAULT 1 CHECK(unlock_level BETWEEN 1 AND 50), unlock_at INTEGER NOT NULL DEFAULT 0, enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
        title TEXT NOT NULL DEFAULT '', body_text TEXT NOT NULL DEFAULT '', image_url TEXT NOT NULL DEFAULT '', button_text TEXT NOT NULL DEFAULT 'Продолжить',
        pages_json TEXT NOT NULL DEFAULT '[]', push_enabled INTEGER NOT NULL DEFAULT 0 CHECK(push_enabled IN (0,1)), push_text TEXT NOT NULL DEFAULT '',
        reward_json TEXT NOT NULL DEFAULT '{}', actions_json TEXT NOT NULL DEFAULT '[]',
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, updated_by TEXT NOT NULL DEFAULT ''
      );

-- Canonical table: season_pass_story_manual_unlocks
CREATE TABLE IF NOT EXISTS season_pass_story_manual_unlocks (
        event_id TEXT NOT NULL, season_id TEXT NOT NULL, telegram_id TEXT NOT NULL,
        unlocked_at INTEGER NOT NULL, actor_telegram_id TEXT NOT NULL DEFAULT '',
        PRIMARY KEY(event_id,telegram_id)
      );

-- Canonical table: season_pass_story_presets
CREATE TABLE IF NOT EXISTS season_pass_story_presets (
        preset_id TEXT PRIMARY KEY, season_id TEXT NOT NULL, seeded_at INTEGER NOT NULL, updated_by TEXT NOT NULL DEFAULT ''
      );

-- Canonical table: season_pass_story_progress
CREATE TABLE IF NOT EXISTS season_pass_story_progress (
        event_id TEXT NOT NULL, season_id TEXT NOT NULL, telegram_id TEXT NOT NULL,
        seen_at INTEGER NOT NULL DEFAULT 0, completed_at INTEGER NOT NULL DEFAULT 0, notified_at INTEGER NOT NULL DEFAULT 0, visual_notice_at INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(event_id,telegram_id)
      );

-- Canonical table: season_pass_story_tests
CREATE TABLE IF NOT EXISTS season_pass_story_tests (
        token TEXT PRIMARY KEY, event_id TEXT NOT NULL, season_id TEXT NOT NULL, telegram_id TEXT NOT NULL,
        expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL
      );

-- Canonical table: season_pass_task_notifications
CREATE TABLE IF NOT EXISTS season_pass_task_notifications (
        season_id TEXT NOT NULL, telegram_id TEXT NOT NULL, task_id TEXT NOT NULL, period_key TEXT NOT NULL,
        task_title TEXT NOT NULL DEFAULT '', xp_reward INTEGER NOT NULL DEFAULT 0, completed_at INTEGER NOT NULL,
        bot_notified_at INTEGER NOT NULL DEFAULT 0, game_read_at INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(season_id,telegram_id,task_id,period_key)
      );

-- Canonical table: season_pass_teaser_deliveries
CREATE TABLE IF NOT EXISTS season_pass_teaser_deliveries (
        season_id TEXT NOT NULL, telegram_id TEXT NOT NULL, unlocked_at INTEGER NOT NULL DEFAULT 0, notified_at INTEGER NOT NULL DEFAULT 0, opened_at INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY(season_id,telegram_id)
      );

-- Canonical table: season_pass_teasers
CREATE TABLE IF NOT EXISTS season_pass_teasers (
        season_id TEXT PRIMARY KEY, target_season_id TEXT NOT NULL DEFAULT '', enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
        unlock_level INTEGER NOT NULL DEFAULT 50 CHECK(unlock_level BETWEEN 1 AND 50),
        envelope_title TEXT NOT NULL DEFAULT 'Вам письмо', title TEXT NOT NULL DEFAULT '', preview_text TEXT NOT NULL DEFAULT '', body_text TEXT NOT NULL DEFAULT '',
        image_url TEXT NOT NULL DEFAULT '', push_text TEXT NOT NULL DEFAULT '', updated_at INTEGER NOT NULL, updated_by TEXT NOT NULL DEFAULT ''
      );

-- Canonical table: shop_assortment
CREATE TABLE IF NOT EXISTS shop_assortment (
  product_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0, 1)),
  points INTEGER NOT NULL DEFAULT 0 CHECK(points >= 0),
  treats INTEGER NOT NULL DEFAULT 0 CHECK(treats >= 0),
  coffee INTEGER NOT NULL DEFAULT 0 CHECK(coffee >= 0),
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);

-- Canonical table: shop_featured_config
CREATE TABLE IF NOT EXISTS shop_featured_config (
  slot TEXT PRIMARY KEY CHECK(slot IN ('rewards', 'skins')),
  item_id TEXT NOT NULL DEFAULT '',
  badge_text TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT NOT NULL DEFAULT ''
);

-- Canonical table: shop_flash_offer_events
CREATE TABLE IF NOT EXISTS shop_flash_offer_events (
  event_id TEXT PRIMARY KEY,
  offer_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Canonical table: shop_flash_offer_purchase_guards
CREATE TABLE IF NOT EXISTS shop_flash_offer_purchase_guards (
  guard_id TEXT PRIMARY KEY,
  ok INTEGER NOT NULL CONSTRAINT flash_offer_purchase_guard_ok CHECK(ok=1)
);

-- Canonical table: shop_flash_offer_purchases
CREATE TABLE IF NOT EXISTS shop_flash_offer_purchases (
  purchase_id TEXT PRIMARY KEY,
  offer_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  request_id TEXT NOT NULL UNIQUE,
  slot_no INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'reserved',
  rewards_json TEXT NOT NULL DEFAULT '[]',
  physical_codes_json TEXT NOT NULL DEFAULT '[]',
  price_points INTEGER NOT NULL DEFAULT 0,
  price_treats INTEGER NOT NULL DEFAULT 0,
  price_coffee INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER NOT NULL DEFAULT 0,
  execution_token TEXT NOT NULL DEFAULT '',
  execution_started_at INTEGER NOT NULL DEFAULT 0
);

-- Canonical table: shop_flash_offers
CREATE TABLE IF NOT EXISTS shop_flash_offers (
  offer_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  badge_text TEXT NOT NULL DEFAULT 'АКЦИЯ',
  image_url TEXT NOT NULL DEFAULT '',
  rewards_json TEXT NOT NULL DEFAULT '[]',
  price_points INTEGER NOT NULL DEFAULT 0,
  price_treats INTEGER NOT NULL DEFAULT 0,
  price_coffee INTEGER NOT NULL DEFAULT 0,
  original_points INTEGER NOT NULL DEFAULT 0,
  original_treats INTEGER NOT NULL DEFAULT 0,
  original_coffee INTEGER NOT NULL DEFAULT 0,
  starts_at INTEGER NOT NULL DEFAULT 0,
  ends_at INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  status TEXT NOT NULL DEFAULT 'draft',
  segment_key TEXT NOT NULL DEFAULT 'all',
  purchase_limit INTEGER NOT NULL DEFAULT 1,
  show_frequency TEXT NOT NULL DEFAULT 'once_session',
  priority INTEGER NOT NULL DEFAULT 100,
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL DEFAULT '',
  created_by_name TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT '',
  updated_by_name TEXT NOT NULL DEFAULT '',
  published_at INTEGER NOT NULL DEFAULT 0,
  ended_at INTEGER NOT NULL DEFAULT 0
);

-- Canonical table: shop_stock_commit_guards
CREATE TABLE IF NOT EXISTS shop_stock_commit_guards (
  guard_id TEXT PRIMARY KEY,
  ok INTEGER NOT NULL CONSTRAINT shop_stock_commit_guard_ok CHECK(ok=1)
);

CREATE INDEX IF NOT EXISTS idx_flash_offer_events_offer ON shop_flash_offer_events(offer_id,event_type,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_flash_offer_player_slot ON shop_flash_offer_purchases(offer_id,telegram_id,slot_no);
CREATE INDEX IF NOT EXISTS idx_flash_offer_purchases_player ON shop_flash_offer_purchases(telegram_id,offer_id,status,created_at);
CREATE INDEX IF NOT EXISTS idx_flash_offers_active ON shop_flash_offers(status,enabled,starts_at,ends_at,priority);
CREATE INDEX IF NOT EXISTS idx_game_run_live_proofs_player ON game_run_live_proofs(telegram_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_run_sessions_expiry ON game_run_sessions(status,expires_at_ms);
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_run_sessions_one_active_player ON game_run_sessions(telegram_id) WHERE status='started';
CREATE INDEX IF NOT EXISTS idx_game_run_sessions_player ON game_run_sessions(telegram_id,status,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_runtime_history_created ON game_runtime_config_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_owner_media_chunks_asset ON owner_media_chunks(asset_id,chunk_index);
CREATE INDEX IF NOT EXISTS idx_owner_media_created ON owner_media_assets(deleted_at,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_owner_staging_change_set_locks_owner ON owner_staging_change_set_locks(owner_telegram_id,expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_owner_staging_items_set ON owner_staging_items(change_set_id,status,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_owner_staging_release_requests_set ON owner_staging_release_requests(change_set_id,operation_kind,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_owner_staging_releases_set ON owner_staging_releases(change_set_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_owner_staging_sets_owner ON owner_staging_change_sets(owner_telegram_id,updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_player_economy_runs_player ON player_economy_run_ledger(telegram_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_player_gift_inbox_player ON player_gift_inbox(telegram_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_season_end_reminder_pending ON season_end_reminder_deliveries(season_key,reminder_key,status,updated_at);
CREATE INDEX IF NOT EXISTS idx_season_pass_case_grants_player ON season_pass_case_grants(telegram_id,status,created_at,case_id);
CREATE INDEX IF NOT EXISTS idx_season_pass_case_items_enabled ON season_pass_case_items(case_id,enabled,reward_kind);
CREATE INDEX IF NOT EXISTS idx_season_pass_case_release ON season_pass_case_definitions(enabled,release_at,season_id);
CREATE INDEX IF NOT EXISTS idx_season_pass_case_resource_items_enabled ON season_pass_case_resource_items(case_id,enabled,reward_kind);
CREATE INDEX IF NOT EXISTS idx_season_pass_story_events_order ON season_pass_story_events(season_id,enabled,unlock_level,sort_order,event_id);
CREATE INDEX IF NOT EXISTS idx_season_pass_story_manual_unlocks_player ON season_pass_story_manual_unlocks(season_id,telegram_id,unlocked_at,event_id);
CREATE INDEX IF NOT EXISTS idx_season_pass_story_progress_player ON season_pass_story_progress(season_id,telegram_id,completed_at,seen_at,event_id);
CREATE INDEX IF NOT EXISTS idx_season_pass_story_tests_player ON season_pass_story_tests(telegram_id,expires_at,event_id);
CREATE INDEX IF NOT EXISTS idx_season_pass_task_notifications_player ON season_pass_task_notifications(season_id,telegram_id,game_read_at,completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_season_pass_teaser_pending ON season_pass_teaser_deliveries(season_id,notified_at,unlocked_at);
CREATE INDEX IF NOT EXISTS idx_shop_stock_player_created_v76 ON shop_stock_consumptions(telegram_id,created_at,category,product_id);

CREATE TABLE IF NOT EXISTS zefirok_schema_contract (
  contract_key TEXT PRIMARY KEY CHECK(contract_key = 'main'),
  contract_version INTEGER NOT NULL CHECK(contract_version >= 1),
  migration_name TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);

INSERT INTO zefirok_schema_contract(contract_key,contract_version,migration_name,updated_at,updated_by)
VALUES('main',1,'0085_schema_contract_v1.sql',unixepoch(),'migration-0085')
ON CONFLICT(contract_key) DO UPDATE SET
  contract_version = CASE WHEN zefirok_schema_contract.contract_version < excluded.contract_version THEN excluded.contract_version ELSE zefirok_schema_contract.contract_version END,
  migration_name = excluded.migration_name,
  updated_at = excluded.updated_at,
  updated_by = excluded.updated_by;
