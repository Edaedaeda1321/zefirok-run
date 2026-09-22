-- Story page unlocks are part of player-visible account state.
CREATE TRIGGER IF NOT EXISTS trg_account_revision_album_story_unlocks_insert
AFTER INSERT ON album_story_unlocks
BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at)
  SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>''
  ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS trg_account_revision_album_story_unlocks_update
AFTER UPDATE ON album_story_unlocks
BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at)
  SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>''
  ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
  INSERT INTO player_account_revision(telegram_id,revision,updated_at)
  SELECT NEW.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(NEW.telegram_id,''))<>''
  ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;

CREATE TRIGGER IF NOT EXISTS trg_account_revision_album_story_unlocks_delete
AFTER DELETE ON album_story_unlocks
BEGIN
  INSERT INTO player_account_revision(telegram_id,revision,updated_at)
  SELECT OLD.telegram_id,1,unixepoch() WHERE TRIM(COALESCE(OLD.telegram_id,''))<>''
  ON CONFLICT(telegram_id) DO UPDATE SET revision=player_account_revision.revision+1,updated_at=excluded.updated_at;
END;
