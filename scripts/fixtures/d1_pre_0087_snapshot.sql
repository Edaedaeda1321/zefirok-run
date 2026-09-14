-- Minimal but real pre-0087 compatibility snapshot used by D1 integration tests.
PRAGMA foreign_keys=OFF;
CREATE TABLE support_tickets(id INTEGER PRIMARY KEY AUTOINCREMENT,status TEXT NOT NULL DEFAULT 'new',closed_at INTEGER NOT NULL DEFAULT 0,updated_at INTEGER NOT NULL DEFAULT 0);
CREATE TABLE support_ticket_workflow(ticket_id INTEGER PRIMARY KEY,workflow_state TEXT NOT NULL DEFAULT 'new',known_issue_id INTEGER NOT NULL DEFAULT 0,last_transition_at INTEGER NOT NULL DEFAULT 0,updated_at INTEGER NOT NULL DEFAULT 0,updated_by TEXT NOT NULL DEFAULT '');

CREATE TABLE reward_delivery_queue(
 id INTEGER PRIMARY KEY AUTOINCREMENT,telegram_id TEXT NOT NULL,source_type TEXT NOT NULL,source_id TEXT NOT NULL DEFAULT '',reward_kind TEXT NOT NULL,reward_id TEXT NOT NULL DEFAULT '',amount INTEGER NOT NULL DEFAULT 1,reason TEXT NOT NULL DEFAULT '',payload_json TEXT NOT NULL DEFAULT '{}',status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,last_error TEXT NOT NULL DEFAULT '',available_at INTEGER NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,delivered_at INTEGER NOT NULL DEFAULT 0,claimed_at INTEGER NOT NULL DEFAULT 0,notify_after INTEGER NOT NULL DEFAULT 0,report_chat_id TEXT NOT NULL DEFAULT '',lease_token TEXT NOT NULL DEFAULT '',lease_until INTEGER NOT NULL DEFAULT 0,UNIQUE(source_type,source_id,telegram_id,reward_kind,reward_id));

CREATE TABLE player_account_revision(telegram_id TEXT PRIMARY KEY,revision INTEGER NOT NULL DEFAULT 1,updated_at INTEGER NOT NULL DEFAULT 0);
CREATE TABLE admin_profile_state(telegram_id TEXT PRIMARY KEY,wallet INTEGER NOT NULL DEFAULT 0,treats INTEGER NOT NULL DEFAULT 0,coffee INTEGER NOT NULL DEFAULT 0,profile_xp INTEGER NOT NULL DEFAULT 0,best_score INTEGER NOT NULL DEFAULT 0,revision INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL DEFAULT 0,updated_at INTEGER NOT NULL DEFAULT 0,updated_by TEXT NOT NULL DEFAULT '');
CREATE TABLE case_player_state(telegram_id TEXT PRIMARY KEY,revision INTEGER NOT NULL DEFAULT 1,owned_avatars_json TEXT NOT NULL DEFAULT '[]',updated_at INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL DEFAULT 0);
CREATE TABLE granted_cases(id TEXT PRIMARY KEY,telegram_id TEXT NOT NULL,case_type TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',granted_by TEXT NOT NULL DEFAULT '',reason TEXT NOT NULL DEFAULT '',rewards_json TEXT NOT NULL DEFAULT '[]',created_at INTEGER NOT NULL,opened_at INTEGER NOT NULL DEFAULT 0,opening_started_at INTEGER NOT NULL DEFAULT 0,opening_token TEXT NOT NULL DEFAULT '');
CREATE TABLE season_pass_players(season_id TEXT NOT NULL,telegram_id TEXT NOT NULL,xp INTEGER NOT NULL DEFAULT 0,premium_tier TEXT NOT NULL DEFAULT 'none',elite_plus_bonus_granted INTEGER NOT NULL DEFAULT 0,revision INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(season_id,telegram_id));
-- Added to the compatibility snapshot so every migration after 0087 can be
-- applied automatically. This is the pre-0089 shape (no open_request_id yet).
CREATE TABLE season_pass_case_grants(
 grant_id TEXT PRIMARY KEY,case_id TEXT NOT NULL,source_season_id TEXT NOT NULL DEFAULT '',telegram_id TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','opening','opened')),rewards_json TEXT NOT NULL DEFAULT '[]',snapshot_json TEXT NOT NULL DEFAULT '{}',
 opening_started_at INTEGER NOT NULL DEFAULT 0,opening_token TEXT NOT NULL DEFAULT '',granted_by TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL,opened_at INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE zefirok_schema_contract(
 contract_key TEXT PRIMARY KEY CHECK(contract_key='main'),contract_version INTEGER NOT NULL CHECK(contract_version>=1),migration_name TEXT NOT NULL,updated_at INTEGER NOT NULL,updated_by TEXT NOT NULL DEFAULT ''
);
INSERT INTO zefirok_schema_contract(contract_key,contract_version,migration_name,updated_at,updated_by)
VALUES('main',1,'0085_schema_contract_v1.sql',1700000000,'snapshot');
CREATE TABLE shop_assortment(product_id TEXT PRIMARY KEY,enabled INTEGER NOT NULL DEFAULT 1,points INTEGER NOT NULL DEFAULT 0,treats INTEGER NOT NULL DEFAULT 0,coffee INTEGER NOT NULL DEFAULT 0,updated_at INTEGER NOT NULL DEFAULT 0);
CREATE TABLE player_economy_meta(meta_key TEXT PRIMARY KEY,value_int INTEGER NOT NULL DEFAULT 0,updated_at INTEGER NOT NULL DEFAULT 0);
INSERT INTO player_economy_meta(meta_key,value_int,updated_at) VALUES('server_authority_cutover_at',1700000000,1700000000);

-- Pre-0087 revision triggers from migration 0058.
CREATE TRIGGER trg_account_revision_profile_insert AFTER INSERT ON admin_profile_state BEGIN INSERT INTO player_account_revision(telegram_id,revision,updated_at) VALUES(NEW.telegram_id,1,unixepoch()) ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at; END;
CREATE TRIGGER trg_account_revision_profile_economy AFTER UPDATE OF wallet,treats,coffee,profile_xp ON admin_profile_state WHEN OLD.wallet<>NEW.wallet OR OLD.treats<>NEW.treats OR OLD.coffee<>NEW.coffee OR OLD.profile_xp<>NEW.profile_xp BEGIN INSERT INTO player_account_revision(telegram_id,revision,updated_at) VALUES(NEW.telegram_id,1,unixepoch()) ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at; END;
CREATE TRIGGER trg_account_revision_case_state_insert AFTER INSERT ON case_player_state BEGIN INSERT INTO player_account_revision(telegram_id,revision,updated_at) VALUES(NEW.telegram_id,1,unixepoch()) ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at; END;
CREATE TRIGGER trg_account_revision_case_state_update AFTER UPDATE ON case_player_state BEGIN INSERT INTO player_account_revision(telegram_id,revision,updated_at) VALUES(NEW.telegram_id,1,unixepoch()) ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at; END;
CREATE TRIGGER trg_account_revision_granted_case_insert AFTER INSERT ON granted_cases BEGIN INSERT INTO player_account_revision(telegram_id,revision,updated_at) VALUES(NEW.telegram_id,1,unixepoch()) ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at; END;
CREATE TRIGGER trg_account_revision_granted_case_update AFTER UPDATE ON granted_cases BEGIN INSERT INTO player_account_revision(telegram_id,revision,updated_at) VALUES(NEW.telegram_id,1,unixepoch()) ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at; END;
CREATE TRIGGER trg_account_revision_pass_insert AFTER INSERT ON season_pass_players BEGIN INSERT INTO player_account_revision(telegram_id,revision,updated_at) VALUES(NEW.telegram_id,1,unixepoch()) ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at; END;
CREATE TRIGGER trg_account_revision_pass_update AFTER UPDATE ON season_pass_players BEGIN INSERT INTO player_account_revision(telegram_id,revision,updated_at) VALUES(NEW.telegram_id,1,unixepoch()) ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at; END;
CREATE TABLE achievement_claims(telegram_id TEXT);
CREATE TABLE achievement_unlocks(telegram_id TEXT);
CREATE TABLE achievement_showcase(telegram_id TEXT);
CREATE TABLE achievement_showcase_preferences(telegram_id TEXT);
CREATE TABLE achievement_showcase_style_ownership(telegram_id TEXT);
CREATE TABLE album_milestone_claims(telegram_id TEXT);
CREATE TABLE daily_loyalty_players(telegram_id TEXT);
CREATE TABLE daily_loyalty_claims(telegram_id TEXT);
CREATE TABLE daily_loyalty_weekly_claims(telegram_id TEXT);
CREATE TABLE daily_loyalty_streak_claims(telegram_id TEXT);
CREATE TABLE daily_loyalty_comeback_claims(telegram_id TEXT);
CREATE TABLE daily_loyalty_protection_grants(telegram_id TEXT);
CREATE TABLE referral_codes(telegram_id TEXT);
CREATE TABLE referral_links(invitee_telegram_id TEXT, referrer_telegram_id TEXT);
CREATE TABLE referral_progress(invitee_telegram_id TEXT);
CREATE TABLE referral_network_progress(referrer_telegram_id TEXT);
CREATE TABLE referral_rewards(beneficiary_telegram_id TEXT);
CREATE TABLE referral_return_progress(invitee_telegram_id TEXT, referrer_telegram_id TEXT);
CREATE TABLE referral_weekly_progress(referrer_telegram_id TEXT, invitee_telegram_id TEXT);
CREATE TABLE referral_reward_choices(referrer_telegram_id TEXT);
CREATE TABLE player_mail_metadata(telegram_id TEXT);
CREATE TABLE player_gift_inbox(telegram_id TEXT);
CREATE TABLE player_task_claims(telegram_id TEXT);
CREATE TABLE player_task_series_claims(telegram_id TEXT);
CREATE TABLE newcomer_path_claims(telegram_id TEXT);
CREATE TABLE friend_coop_claims(telegram_id TEXT);
CREATE TABLE season_pass_task_claims(telegram_id TEXT);
CREATE TABLE leaderboard_rewards(telegram_id TEXT);
CREATE TABLE player_poll_responses(telegram_id TEXT);
CREATE TABLE player_poll_votes(telegram_id TEXT);
CREATE TABLE season_pass_claims(season_id TEXT NOT NULL,telegram_id TEXT NOT NULL,level INTEGER NOT NULL,lane TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',reward_json TEXT NOT NULL DEFAULT '{}',claimed_at INTEGER NOT NULL DEFAULT 0,delivered_at INTEGER NOT NULL DEFAULT 0,error_text TEXT NOT NULL DEFAULT '',PRIMARY KEY(season_id,telegram_id,level,lane));
CREATE TABLE season_pass_entitlements(season_id TEXT NOT NULL,telegram_id TEXT NOT NULL,item_id TEXT NOT NULL,source TEXT NOT NULL DEFAULT '',granted_at INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(season_id,telegram_id,item_id));
CREATE TABLE player_mail_v3(mail_id TEXT NOT NULL,telegram_id TEXT NOT NULL,subject TEXT NOT NULL DEFAULT '',reward_state TEXT NOT NULL DEFAULT 'none',read_at INTEGER NOT NULL DEFAULT 0,claimed_at INTEGER NOT NULL DEFAULT 0,updated_at INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(mail_id,telegram_id));
CREATE TABLE referral_friend_gifts(gift_id TEXT PRIMARY KEY,sender_telegram_id TEXT NOT NULL,recipient_telegram_id TEXT NOT NULL,reward_json TEXT NOT NULL DEFAULT '{}',reward_id TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL DEFAULT 0);

-- Deliberately inconsistent legacy rows: migration 0087 must reconcile them.
INSERT INTO support_tickets(id,status,closed_at,updated_at) VALUES(1,'resolved',1700000000,1700000000);
INSERT INTO support_ticket_workflow(ticket_id,workflow_state,known_issue_id,last_transition_at,updated_at,updated_by) VALUES(1,'waiting_player',0,1700000100,1700000100,'snapshot');
INSERT INTO reward_delivery_queue(telegram_id,source_type,source_id,reward_kind,reward_id,amount,available_at,created_at,updated_at) VALUES('legacy-player','legacy','','points','',100,1,1,1);

-- Operational tables that already exist in a real pre-0088 production schema.
-- They are included in the old-schema fixture so migration 0088 is exercised
-- against the same table families it indexes/archives.
CREATE TABLE game_case_drop_settings(
 config_id TEXT PRIMARY KEY,
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 chance_bps INTEGER NOT NULL DEFAULT 700 CHECK(chance_bps BETWEEN 0 AND 10000),
 weight_small INTEGER NOT NULL DEFAULT 7000 CHECK(weight_small BETWEEN 0 AND 1000000),
 weight_sweet INTEGER NOT NULL DEFAULT 2200 CHECK(weight_sweet BETWEEN 0 AND 1000000),
 weight_gold INTEGER NOT NULL DEFAULT 600 CHECK(weight_gold BETWEEN 0 AND 1000000),
 weight_mythic INTEGER NOT NULL DEFAULT 200 CHECK(weight_mythic BETWEEN 0 AND 1000000),
 weight_legendary INTEGER NOT NULL DEFAULT 0 CHECK(weight_legendary BETWEEN 0 AND 1000000),
 spawn_min_ms INTEGER NOT NULL DEFAULT 10000 CHECK(spawn_min_ms BETWEEN 1000 AND 300000),
 spawn_max_ms INTEGER NOT NULL DEFAULT 35000 CHECK(spawn_max_ms BETWEEN 1000 AND 300000),
 updated_at INTEGER NOT NULL
);
INSERT INTO game_case_drop_settings(config_id,enabled,chance_bps,weight_small,weight_sweet,weight_gold,weight_mythic,weight_legendary,spawn_min_ms,spawn_max_ms,updated_at)
VALUES ('main',0,700,7000,2200,600,200,0,10000,35000,1700000000);
CREATE TABLE game_run_case_drops(
 run_id TEXT PRIMARY KEY,
 telegram_id TEXT NOT NULL,
 case_type TEXT NOT NULL CHECK(case_type IN ('small','sweet','gold','mythic','legendary')),
 spawn_after_ms INTEGER NOT NULL CHECK(spawn_after_ms BETWEEN 1000 AND 600000),
 caught INTEGER NOT NULL DEFAULT 0 CHECK(caught IN (0,1)),
 granted INTEGER NOT NULL DEFAULT 0 CHECK(granted IN (0,1)),
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE INDEX idx_game_run_case_drops_player ON game_run_case_drops(telegram_id,created_at DESC);
CREATE TABLE game_run_sessions(
 run_id TEXT PRIMARY KEY,telegram_id TEXT NOT NULL,started_at_ms INTEGER NOT NULL,expires_at_ms INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'started',skin_id TEXT NOT NULL DEFAULT 'default',finished_at_ms INTEGER NOT NULL DEFAULT 0,duration_ms INTEGER NOT NULL DEFAULT 0,score INTEGER NOT NULL DEFAULT 0,run_treats INTEGER NOT NULL DEFAULT 0,run_coffee INTEGER NOT NULL DEFAULT 0,booster_points INTEGER NOT NULL DEFAULT 0,booster_treats INTEGER NOT NULL DEFAULT 0,booster_coffee INTEGER NOT NULL DEFAULT 0,booster_shield INTEGER NOT NULL DEFAULT 0,booster_second_chance INTEGER NOT NULL DEFAULT 0,booster_pause INTEGER NOT NULL DEFAULT 0,shield_used INTEGER NOT NULL DEFAULT 0,second_chance_used INTEGER NOT NULL DEFAULT 0,economy_points INTEGER NOT NULL DEFAULT 0,economy_treats INTEGER NOT NULL DEFAULT 0,economy_coffee INTEGER NOT NULL DEFAULT 0,profile_xp INTEGER NOT NULL DEFAULT 0,new_record INTEGER NOT NULL DEFAULT 0,accepted_rating INTEGER NOT NULL DEFAULT 0,season_id TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
CREATE TABLE game_run_live_proofs(run_id TEXT PRIMARY KEY,telegram_id TEXT NOT NULL,seq INTEGER NOT NULL DEFAULT 0,duration_ms INTEGER NOT NULL DEFAULT 0,score INTEGER NOT NULL DEFAULT 0,run_treats INTEGER NOT NULL DEFAULT 0,run_coffee INTEGER NOT NULL DEFAULT 0,last_server_at_ms INTEGER NOT NULL,anchor_duration_ms INTEGER NOT NULL DEFAULT 0,anchor_server_at_ms INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
CREATE TABLE player_economy_run_ledger(run_id TEXT PRIMARY KEY,telegram_id TEXT NOT NULL,points INTEGER NOT NULL DEFAULT 0,treats INTEGER NOT NULL DEFAULT 0,coffee INTEGER NOT NULL DEFAULT 0,profile_xp INTEGER NOT NULL DEFAULT 0,raw_score INTEGER NOT NULL DEFAULT 0,raw_treats INTEGER NOT NULL DEFAULT 0,raw_coffee INTEGER NOT NULL DEFAULT 0,duration_ms INTEGER NOT NULL DEFAULT 0,booster_type TEXT NOT NULL DEFAULT '',booster_types_json TEXT NOT NULL DEFAULT '[]',skin_id TEXT NOT NULL DEFAULT 'default',new_record INTEGER NOT NULL DEFAULT 0,accepted_rating INTEGER NOT NULL DEFAULT 0,season_id TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL);
CREATE TABLE admin_performance_samples(id INTEGER PRIMARY KEY AUTOINCREMENT,area TEXT NOT NULL,duration_ms INTEGER NOT NULL,success INTEGER NOT NULL DEFAULT 1,error_text TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL);
CREATE TABLE server_analytics_hourly(bucket_at INTEGER PRIMARY KEY,active_players INTEGER NOT NULL DEFAULT 0,new_players INTEGER NOT NULL DEFAULT 0,runs_total INTEGER NOT NULL DEFAULT 0,runs_accepted INTEGER NOT NULL DEFAULT 0,cases_opened INTEGER NOT NULL DEFAULT 0,shop_operations INTEGER NOT NULL DEFAULT 0,rewards_delivered INTEGER NOT NULL DEFAULT 0,rewards_failed INTEGER NOT NULL DEFAULT 0,staff_notifications_sent INTEGER NOT NULL DEFAULT 0,staff_notifications_failed INTEGER NOT NULL DEFAULT 0,player_notifications_sent INTEGER NOT NULL DEFAULT 0,player_notifications_failed INTEGER NOT NULL DEFAULT 0,cron_runs INTEGER NOT NULL DEFAULT 0,cron_failures INTEGER NOT NULL DEFAULT 0,cron_duration_ms INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
CREATE TABLE content_analytics_events(id INTEGER PRIMARY KEY AUTOINCREMENT,telegram_id TEXT NOT NULL,item_kind TEXT NOT NULL,item_id TEXT NOT NULL,event_type TEXT NOT NULL,source_type TEXT NOT NULL DEFAULT '',source_id TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL,UNIQUE(telegram_id,item_kind,item_id,event_type,source_type,source_id));
CREATE TABLE player_timeline_events(id INTEGER PRIMARY KEY AUTOINCREMENT,telegram_id TEXT NOT NULL,event_type TEXT NOT NULL,title TEXT NOT NULL,details_json TEXT NOT NULL DEFAULT '{}',source_id TEXT NOT NULL DEFAULT '',actor_telegram_id TEXT NOT NULL DEFAULT '',actor_name TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL,UNIQUE(telegram_id,event_type,source_id));
CREATE TABLE reward_delivery_effects(queue_id INTEGER PRIMARY KEY,telegram_id TEXT NOT NULL,reward_kind TEXT NOT NULL,reward_id TEXT NOT NULL DEFAULT '',apply_token TEXT NOT NULL,applied_at INTEGER NOT NULL);
CREATE TABLE leaderboard_runs(run_id TEXT PRIMARY KEY,telegram_id TEXT NOT NULL,score INTEGER NOT NULL DEFAULT 0,accepted INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL DEFAULT 0);
CREATE TABLE player_notification_queue(id INTEGER PRIMARY KEY AUTOINCREMENT,telegram_id TEXT NOT NULL,chat_id TEXT NOT NULL,category TEXT NOT NULL,message_html TEXT NOT NULL,reply_markup_json TEXT NOT NULL DEFAULT '{}',status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,last_error TEXT NOT NULL DEFAULT '',available_at INTEGER NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,lease_token TEXT NOT NULL DEFAULT '',lease_until INTEGER NOT NULL DEFAULT 0);
CREATE TABLE player_notification_log(id INTEGER PRIMARY KEY AUTOINCREMENT,telegram_id TEXT NOT NULL,category TEXT NOT NULL,sent_at INTEGER NOT NULL);
CREATE TABLE leaderboard_staff_notifications(id INTEGER PRIMARY KEY AUTOINCREMENT,event_key TEXT NOT NULL,recipient_telegram_id TEXT NOT NULL,message_html TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,last_error TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,sent_at INTEGER NOT NULL DEFAULT 0,available_at INTEGER NOT NULL DEFAULT 0,lease_token TEXT NOT NULL DEFAULT '',lease_until INTEGER NOT NULL DEFAULT 0,UNIQUE(event_key,recipient_telegram_id));
