-- v0.87: P1 platform hardening
-- Support workflow authority, global account revision coverage, reward queue
-- idempotency keys, and auditable retirement of lazy legacy migrations.

-- -------------------------------------------------------------------------
-- Support Center: support_ticket_workflow.workflow_state is authoritative.
-- support_tickets.status remains a compatibility shadow only.
-- -------------------------------------------------------------------------

-- First reconcile any pre-existing split-brain rows in favor of workflow_state.
UPDATE support_tickets
SET status = CASE (SELECT w.workflow_state FROM support_ticket_workflow w WHERE w.ticket_id=support_tickets.id)
    WHEN 'resolved' THEN 'resolved'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'new' THEN 'new'
    ELSE 'working'
  END,
  closed_at = CASE
    WHEN (SELECT w.workflow_state FROM support_ticket_workflow w WHERE w.ticket_id=support_tickets.id) IN ('resolved','rejected')
      THEN CASE WHEN closed_at>0 THEN closed_at ELSE unixepoch() END
    ELSE 0
  END
WHERE EXISTS(SELECT 1 FROM support_ticket_workflow w WHERE w.ticket_id=support_tickets.id);

-- Legacy writers which create a ticket without a workflow row are bridged into
-- the new authority. This trigger is compatibility-only; new code writes workflow.
CREATE TRIGGER IF NOT EXISTS trg_support_ticket_seed_workflow
AFTER INSERT ON support_tickets
WHEN NOT EXISTS(SELECT 1 FROM support_ticket_workflow w WHERE w.ticket_id=NEW.id)
BEGIN
  INSERT INTO support_ticket_workflow(ticket_id,workflow_state,known_issue_id,last_transition_at,updated_at,updated_by)
  VALUES(NEW.id,CASE NEW.status WHEN 'working' THEN 'working' WHEN 'resolved' THEN 'resolved' WHEN 'rejected' THEN 'rejected' ELSE 'new' END,0,NEW.updated_at,NEW.updated_at,'legacy-insert-bridge');
END;

-- Authoritative workflow -> compatibility shadow. Rich workflow states collapse to
-- legacy 'working'; terminal states keep closed_at coherent.
CREATE TRIGGER IF NOT EXISTS trg_support_workflow_shadow_insert
AFTER INSERT ON support_ticket_workflow
BEGIN
  UPDATE support_tickets
  SET status=CASE NEW.workflow_state WHEN 'resolved' THEN 'resolved' WHEN 'rejected' THEN 'rejected' WHEN 'new' THEN 'new' ELSE 'working' END,
      closed_at=CASE WHEN NEW.workflow_state IN ('resolved','rejected') THEN CASE WHEN closed_at>0 THEN closed_at ELSE NEW.updated_at END ELSE 0 END,
      updated_at=MAX(updated_at,NEW.updated_at)
  WHERE id=NEW.ticket_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_support_workflow_shadow_update
AFTER UPDATE OF workflow_state,updated_at ON support_ticket_workflow
WHEN OLD.workflow_state<>NEW.workflow_state OR OLD.updated_at<>NEW.updated_at
BEGIN
  UPDATE support_tickets
  SET status=CASE NEW.workflow_state WHEN 'resolved' THEN 'resolved' WHEN 'rejected' THEN 'rejected' WHEN 'new' THEN 'new' ELSE 'working' END,
      closed_at=CASE WHEN NEW.workflow_state IN ('resolved','rejected') THEN CASE WHEN closed_at>0 THEN closed_at ELSE NEW.updated_at END ELSE 0 END,
      updated_at=MAX(updated_at,NEW.updated_at)
  WHERE id=NEW.ticket_id;
END;

-- Temporary bridge for legacy code which still writes support_tickets.status. The
-- guard is crucial: a shadow write caused by workflow must not collapse a rich
-- state such as waiting_player back to plain working.
CREATE TRIGGER IF NOT EXISTS trg_support_legacy_status_bridge
AFTER UPDATE OF status ON support_tickets
WHEN NEW.status<>OLD.status
 AND EXISTS(SELECT 1 FROM support_ticket_workflow w WHERE w.ticket_id=NEW.id)
 AND NEW.status<>CASE (SELECT w.workflow_state FROM support_ticket_workflow w WHERE w.ticket_id=NEW.id)
      WHEN 'resolved' THEN 'resolved' WHEN 'rejected' THEN 'rejected' WHEN 'new' THEN 'new' ELSE 'working' END
BEGIN
  UPDATE support_ticket_workflow
  SET workflow_state=CASE NEW.status WHEN 'resolved' THEN 'resolved' WHEN 'rejected' THEN 'rejected' WHEN 'working' THEN 'working' ELSE 'new' END,
      last_transition_at=NEW.updated_at,updated_at=NEW.updated_at,updated_by='legacy-status-bridge'
  WHERE ticket_id=NEW.id;
END;

-- -------------------------------------------------------------------------
-- Reward queue: every operation has a first-class idempotency key.
-- -------------------------------------------------------------------------
ALTER TABLE reward_delivery_queue ADD COLUMN operation_id TEXT NOT NULL DEFAULT '';

UPDATE reward_delivery_queue
SET operation_id='rq:v1:'||json_array(source_type,source_id,telegram_id,reward_kind,reward_id)
WHERE TRIM(operation_id)='';

CREATE UNIQUE INDEX IF NOT EXISTS idx_reward_delivery_operation_id
ON reward_delivery_queue(operation_id) WHERE operation_id<>'';

-- Rolling-deploy bridge for an old Worker. New Worker inserts operation_id itself.
CREATE TRIGGER IF NOT EXISTS trg_reward_delivery_operation_id_legacy
AFTER INSERT ON reward_delivery_queue
WHEN TRIM(NEW.operation_id)=''
BEGIN
  UPDATE reward_delivery_queue
  SET operation_id='rq:v1:'||json_array(NEW.source_type,NEW.source_id,NEW.telegram_id,NEW.reward_kind,NEW.reward_id)
  WHERE id=NEW.id;
END;

-- -------------------------------------------------------------------------
-- Global accountRevision. A revision is an invalidation token, not an event
-- counter; over-bumping is harmless while missed account mutations are not.
-- -------------------------------------------------------------------------
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT telegram_id,1,unixepoch() FROM achievement_claims WHERE TRIM(COALESCE(telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT telegram_id,1,unixepoch() FROM achievement_unlocks WHERE TRIM(COALESCE(telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT telegram_id,1,unixepoch() FROM achievement_showcase WHERE TRIM(COALESCE(telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT telegram_id,1,unixepoch() FROM achievement_showcase_preferences WHERE TRIM(COALESCE(telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT telegram_id,1,unixepoch() FROM achievement_showcase_style_ownership WHERE TRIM(COALESCE(telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT telegram_id,1,unixepoch() FROM album_milestone_claims WHERE TRIM(COALESCE(telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT telegram_id,1,unixepoch() FROM daily_loyalty_players WHERE TRIM(COALESCE(telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT telegram_id,1,unixepoch() FROM daily_loyalty_claims WHERE TRIM(COALESCE(telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT telegram_id,1,unixepoch() FROM daily_loyalty_weekly_claims WHERE TRIM(COALESCE(telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT telegram_id,1,unixepoch() FROM daily_loyalty_streak_claims WHERE TRIM(COALESCE(telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT telegram_id,1,unixepoch() FROM daily_loyalty_comeback_claims WHERE TRIM(COALESCE(telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT telegram_id,1,unixepoch() FROM daily_loyalty_protection_grants WHERE TRIM(COALESCE(telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT telegram_id,1,unixepoch() FROM referral_codes WHERE TRIM(COALESCE(telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT invitee_telegram_id,1,unixepoch() FROM referral_links WHERE TRIM(COALESCE(invitee_telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT referrer_telegram_id,1,unixepoch() FROM referral_links WHERE TRIM(COALESCE(referrer_telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT invitee_telegram_id,1,unixepoch() FROM referral_progress WHERE TRIM(COALESCE(invitee_telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT referrer_telegram_id,1,unixepoch() FROM referral_network_progress WHERE TRIM(COALESCE(referrer_telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT beneficiary_telegram_id,1,unixepoch() FROM referral_rewards WHERE TRIM(COALESCE(beneficiary_telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT invitee_telegram_id,1,unixepoch() FROM referral_return_progress WHERE TRIM(COALESCE(invitee_telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT referrer_telegram_id,1,unixepoch() FROM referral_return_progress WHERE TRIM(COALESCE(referrer_telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT sender_telegram_id,1,unixepoch() FROM referral_friend_gifts WHERE TRIM(COALESCE(sender_telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT recipient_telegram_id,1,unixepoch() FROM referral_friend_gifts WHERE TRIM(COALESCE(recipient_telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT referrer_telegram_id,1,unixepoch() FROM referral_weekly_progress WHERE TRIM(COALESCE(referrer_telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT invitee_telegram_id,1,unixepoch() FROM referral_weekly_progress WHERE TRIM(COALESCE(invitee_telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT referrer_telegram_id,1,unixepoch() FROM referral_reward_choices WHERE TRIM(COALESCE(referrer_telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT telegram_id,1,unixepoch() FROM player_mail_v3 WHERE TRIM(COALESCE(telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT telegram_id,1,unixepoch() FROM player_mail_metadata WHERE TRIM(COALESCE(telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT telegram_id,1,unixepoch() FROM player_gift_inbox WHERE TRIM(COALESCE(telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT telegram_id,1,unixepoch() FROM player_task_claims WHERE TRIM(COALESCE(telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT telegram_id,1,unixepoch() FROM player_task_series_claims WHERE TRIM(COALESCE(telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT telegram_id,1,unixepoch() FROM newcomer_path_claims WHERE TRIM(COALESCE(telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT telegram_id,1,unixepoch() FROM friend_coop_claims WHERE TRIM(COALESCE(telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT telegram_id,1,unixepoch() FROM season_pass_claims WHERE TRIM(COALESCE(telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT telegram_id,1,unixepoch() FROM season_pass_entitlements WHERE TRIM(COALESCE(telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT telegram_id,1,unixepoch() FROM season_pass_task_claims WHERE TRIM(COALESCE(telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT telegram_id,1,unixepoch() FROM leaderboard_rewards WHERE TRIM(COALESCE(telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT telegram_id,1,unixepoch() FROM player_poll_responses WHERE TRIM(COALESCE(telegram_id,''))<>'';
INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at) SELECT DISTINCT telegram_id,1,unixepoch() FROM player_poll_votes WHERE TRIM(COALESCE(telegram_id,''))<>'';

CREATE TRIGGER IF NOT EXISTS trg_account_revision_achievement_claims_insert AFTER INSERT ON achievement_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_achievement_claims_update AFTER UPDATE ON achievement_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_achievement_claims_delete AFTER DELETE ON achievement_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_achievement_unlocks_insert AFTER INSERT ON achievement_unlocks BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_achievement_unlocks_update AFTER UPDATE ON achievement_unlocks BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_achievement_unlocks_delete AFTER DELETE ON achievement_unlocks BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_achievement_showcase_insert AFTER INSERT ON achievement_showcase BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_achievement_showcase_update AFTER UPDATE ON achievement_showcase BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_achievement_showcase_delete AFTER DELETE ON achievement_showcase BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_achievement_showcase_preferences_insert AFTER INSERT ON achievement_showcase_preferences BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_achievement_showcase_preferences_update AFTER UPDATE ON achievement_showcase_preferences BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_achievement_showcase_preferences_delete AFTER DELETE ON achievement_showcase_preferences BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_achievement_showcase_style_ownership_insert AFTER INSERT ON achievement_showcase_style_ownership BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_achievement_showcase_style_ownership_update AFTER UPDATE ON achievement_showcase_style_ownership BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_achievement_showcase_style_ownership_delete AFTER DELETE ON achievement_showcase_style_ownership BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_album_milestone_claims_insert AFTER INSERT ON album_milestone_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_album_milestone_claims_update AFTER UPDATE ON album_milestone_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_album_milestone_claims_delete AFTER DELETE ON album_milestone_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_daily_loyalty_players_insert AFTER INSERT ON daily_loyalty_players BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_daily_loyalty_players_update AFTER UPDATE ON daily_loyalty_players BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_daily_loyalty_players_delete AFTER DELETE ON daily_loyalty_players BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_daily_loyalty_claims_insert AFTER INSERT ON daily_loyalty_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_daily_loyalty_claims_update AFTER UPDATE ON daily_loyalty_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_daily_loyalty_claims_delete AFTER DELETE ON daily_loyalty_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_daily_loyalty_weekly_claims_insert AFTER INSERT ON daily_loyalty_weekly_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_daily_loyalty_weekly_claims_update AFTER UPDATE ON daily_loyalty_weekly_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_daily_loyalty_weekly_claims_delete AFTER DELETE ON daily_loyalty_weekly_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_daily_loyalty_streak_claims_insert AFTER INSERT ON daily_loyalty_streak_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_daily_loyalty_streak_claims_update AFTER UPDATE ON daily_loyalty_streak_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_daily_loyalty_streak_claims_delete AFTER DELETE ON daily_loyalty_streak_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_daily_loyalty_comeback_claims_insert AFTER INSERT ON daily_loyalty_comeback_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_daily_loyalty_comeback_claims_update AFTER UPDATE ON daily_loyalty_comeback_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_daily_loyalty_comeback_claims_delete AFTER DELETE ON daily_loyalty_comeback_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_daily_loyalty_protection_grants_insert AFTER INSERT ON daily_loyalty_protection_grants BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_daily_loyalty_protection_grants_update AFTER UPDATE ON daily_loyalty_protection_grants BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_daily_loyalty_protection_grants_delete AFTER DELETE ON daily_loyalty_protection_grants BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_referral_codes_insert AFTER INSERT ON referral_codes BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_referral_codes_update AFTER UPDATE ON referral_codes BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_referral_codes_delete AFTER DELETE ON referral_codes BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_referral_links_insert AFTER INSERT ON referral_links BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.invitee_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.invitee_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.referrer_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.referrer_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_referral_links_update AFTER UPDATE ON referral_links BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.invitee_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.invitee_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.referrer_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.referrer_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.invitee_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.invitee_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.referrer_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.referrer_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_referral_links_delete AFTER DELETE ON referral_links BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.invitee_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.invitee_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.referrer_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.referrer_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_referral_progress_insert AFTER INSERT ON referral_progress BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.invitee_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.invitee_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_referral_progress_update AFTER UPDATE ON referral_progress BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.invitee_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.invitee_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.invitee_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.invitee_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_referral_progress_delete AFTER DELETE ON referral_progress BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.invitee_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.invitee_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_referral_network_progress_insert AFTER INSERT ON referral_network_progress BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.referrer_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.referrer_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_referral_network_progress_update AFTER UPDATE ON referral_network_progress BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.referrer_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.referrer_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.referrer_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.referrer_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_referral_network_progress_delete AFTER DELETE ON referral_network_progress BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.referrer_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.referrer_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_referral_rewards_insert AFTER INSERT ON referral_rewards BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.beneficiary_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.beneficiary_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_referral_rewards_update AFTER UPDATE ON referral_rewards BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.beneficiary_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.beneficiary_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.beneficiary_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.beneficiary_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_referral_rewards_delete AFTER DELETE ON referral_rewards BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.beneficiary_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.beneficiary_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_referral_return_progress_insert AFTER INSERT ON referral_return_progress BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.invitee_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.invitee_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.referrer_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.referrer_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_referral_return_progress_update AFTER UPDATE ON referral_return_progress BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.invitee_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.invitee_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.referrer_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.referrer_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.invitee_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.invitee_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.referrer_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.referrer_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_referral_return_progress_delete AFTER DELETE ON referral_return_progress BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.invitee_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.invitee_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.referrer_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.referrer_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_referral_friend_gifts_insert AFTER INSERT ON referral_friend_gifts BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.sender_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.sender_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.recipient_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.recipient_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_referral_friend_gifts_update AFTER UPDATE ON referral_friend_gifts BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.sender_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.sender_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.recipient_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.recipient_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.sender_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.sender_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.recipient_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.recipient_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_referral_friend_gifts_delete AFTER DELETE ON referral_friend_gifts BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.sender_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.sender_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.recipient_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.recipient_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_referral_weekly_progress_insert AFTER INSERT ON referral_weekly_progress BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.referrer_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.referrer_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.invitee_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.invitee_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_referral_weekly_progress_update AFTER UPDATE ON referral_weekly_progress BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.referrer_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.referrer_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.invitee_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.invitee_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.referrer_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.referrer_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.invitee_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.invitee_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_referral_weekly_progress_delete AFTER DELETE ON referral_weekly_progress BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.referrer_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.referrer_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.invitee_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.invitee_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_referral_reward_choices_insert AFTER INSERT ON referral_reward_choices BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.referrer_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.referrer_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_referral_reward_choices_update AFTER UPDATE ON referral_reward_choices BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.referrer_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.referrer_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.referrer_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.referrer_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_referral_reward_choices_delete AFTER DELETE ON referral_reward_choices BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.referrer_telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.referrer_telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_player_mail_v3_insert AFTER INSERT ON player_mail_v3 BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_player_mail_v3_update AFTER UPDATE ON player_mail_v3 BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_player_mail_v3_delete AFTER DELETE ON player_mail_v3 BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_player_mail_metadata_insert AFTER INSERT ON player_mail_metadata BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_player_mail_metadata_update AFTER UPDATE ON player_mail_metadata BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_player_mail_metadata_delete AFTER DELETE ON player_mail_metadata BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_player_gift_inbox_insert AFTER INSERT ON player_gift_inbox BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_player_gift_inbox_update AFTER UPDATE ON player_gift_inbox BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_player_gift_inbox_delete AFTER DELETE ON player_gift_inbox BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_player_task_claims_insert AFTER INSERT ON player_task_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_player_task_claims_update AFTER UPDATE ON player_task_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_player_task_claims_delete AFTER DELETE ON player_task_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_player_task_series_claims_insert AFTER INSERT ON player_task_series_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_player_task_series_claims_update AFTER UPDATE ON player_task_series_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_player_task_series_claims_delete AFTER DELETE ON player_task_series_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_newcomer_path_claims_insert AFTER INSERT ON newcomer_path_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_newcomer_path_claims_update AFTER UPDATE ON newcomer_path_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_newcomer_path_claims_delete AFTER DELETE ON newcomer_path_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_friend_coop_claims_insert AFTER INSERT ON friend_coop_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_friend_coop_claims_update AFTER UPDATE ON friend_coop_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_friend_coop_claims_delete AFTER DELETE ON friend_coop_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_season_pass_claims_insert AFTER INSERT ON season_pass_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_season_pass_claims_update AFTER UPDATE ON season_pass_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_season_pass_claims_delete AFTER DELETE ON season_pass_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_season_pass_entitlements_insert AFTER INSERT ON season_pass_entitlements BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_season_pass_entitlements_update AFTER UPDATE ON season_pass_entitlements BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_season_pass_entitlements_delete AFTER DELETE ON season_pass_entitlements BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_season_pass_task_claims_insert AFTER INSERT ON season_pass_task_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_season_pass_task_claims_update AFTER UPDATE ON season_pass_task_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_season_pass_task_claims_delete AFTER DELETE ON season_pass_task_claims BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_leaderboard_rewards_insert AFTER INSERT ON leaderboard_rewards BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_leaderboard_rewards_update AFTER UPDATE ON leaderboard_rewards BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_leaderboard_rewards_delete AFTER DELETE ON leaderboard_rewards BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_player_poll_responses_insert AFTER INSERT ON player_poll_responses BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_player_poll_responses_update AFTER UPDATE ON player_poll_responses BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_player_poll_responses_delete AFTER DELETE ON player_poll_responses BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_player_poll_votes_insert AFTER INSERT ON player_poll_votes BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_player_poll_votes_update AFTER UPDATE ON player_poll_votes BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
CREATE TRIGGER IF NOT EXISTS trg_account_revision_player_poll_votes_delete AFTER DELETE ON player_poll_votes BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at) SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>'' ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;

-- -------------------------------------------------------------------------
-- Legacy player migration retirement audit. Cron backfill moves a migration
-- from backfill -> read_fallback only after remaining_rows reaches zero.
-- Runtime legacy mutation paths consult this table before doing lazy writes.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS player_legacy_migration_audit (
  migration_key TEXT PRIMARY KEY,
  phase TEXT NOT NULL DEFAULT 'backfill' CHECK(phase IN ('backfill','read_fallback','retired')),
  cutoff_at INTEGER NOT NULL DEFAULT 0,
  total_rows INTEGER NOT NULL DEFAULT 0,
  migrated_rows INTEGER NOT NULL DEFAULT 0,
  remaining_rows INTEGER NOT NULL DEFAULT 0,
  last_error TEXT NOT NULL DEFAULT '',
  checked_at INTEGER NOT NULL DEFAULT 0,
  completed_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO player_legacy_migration_audit(migration_key,phase,cutoff_at,updated_at) VALUES
('authoritative_economy_cutover','backfill',COALESCE((SELECT value_int FROM player_economy_meta WHERE meta_key='server_authority_cutover_at' LIMIT 1),unixepoch()),unixepoch()),
('season_pass_balance_v2','backfill',unixepoch(),unixepoch());
