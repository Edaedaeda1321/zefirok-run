-- v1.0.10: monotonic account revision for cross-screen reward/account synchronization.
-- Existing reward systems remain server-authoritative; this layer provides one cheap
-- change token so UI surfaces can invalidate stale account snapshots consistently.

CREATE TABLE IF NOT EXISTS player_account_revision (
  telegram_id TEXT PRIMARY KEY,
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision >= 1),
  updated_at INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_player_account_revision_updated
ON player_account_revision(updated_at DESC);

INSERT OR IGNORE INTO player_account_revision(telegram_id,revision,updated_at)
SELECT telegram_id,1,unixepoch() FROM admin_profile_state
UNION SELECT telegram_id,1,unixepoch() FROM case_player_state
UNION SELECT telegram_id,1,unixepoch() FROM granted_cases
UNION SELECT telegram_id,1,unixepoch() FROM season_pass_players;

CREATE TRIGGER IF NOT EXISTS trg_account_revision_profile_insert
AFTER INSERT ON admin_profile_state
BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at)
  VALUES(NEW.telegram_id,1,unixepoch())
  ON CONFLICT(telegram_id) DO UPDATE SET
    revision=player_account_revision.revision+1,
    updated_at=excluded.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS trg_account_revision_profile_economy
AFTER UPDATE OF wallet,treats,coffee,profile_xp ON admin_profile_state
WHEN OLD.wallet<>NEW.wallet OR OLD.treats<>NEW.treats OR OLD.coffee<>NEW.coffee OR OLD.profile_xp<>NEW.profile_xp
BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at)
  VALUES(NEW.telegram_id,1,unixepoch())
  ON CONFLICT(telegram_id) DO UPDATE SET
    revision=player_account_revision.revision+1,
    updated_at=excluded.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS trg_account_revision_case_state_insert
AFTER INSERT ON case_player_state
BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at)
  VALUES(NEW.telegram_id,1,unixepoch())
  ON CONFLICT(telegram_id) DO UPDATE SET
    revision=player_account_revision.revision+1,
    updated_at=excluded.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS trg_account_revision_case_state_update
AFTER UPDATE ON case_player_state
BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at)
  VALUES(NEW.telegram_id,1,unixepoch())
  ON CONFLICT(telegram_id) DO UPDATE SET
    revision=player_account_revision.revision+1,
    updated_at=excluded.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS trg_account_revision_granted_case_insert
AFTER INSERT ON granted_cases
BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at)
  VALUES(NEW.telegram_id,1,unixepoch())
  ON CONFLICT(telegram_id) DO UPDATE SET
    revision=player_account_revision.revision+1,
    updated_at=excluded.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS trg_account_revision_granted_case_update
AFTER UPDATE ON granted_cases
BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at)
  VALUES(NEW.telegram_id,1,unixepoch())
  ON CONFLICT(telegram_id) DO UPDATE SET
    revision=player_account_revision.revision+1,
    updated_at=excluded.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS trg_account_revision_pass_insert
AFTER INSERT ON season_pass_players
BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at)
  VALUES(NEW.telegram_id,1,unixepoch())
  ON CONFLICT(telegram_id) DO UPDATE SET
    revision=player_account_revision.revision+1,
    updated_at=excluded.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS trg_account_revision_pass_update
AFTER UPDATE ON season_pass_players
BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at)
  VALUES(NEW.telegram_id,1,unixepoch())
  ON CONFLICT(telegram_id) DO UPDATE SET
    revision=player_account_revision.revision+1,
    updated_at=excluded.updated_at;
END;
