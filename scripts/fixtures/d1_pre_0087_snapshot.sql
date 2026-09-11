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
