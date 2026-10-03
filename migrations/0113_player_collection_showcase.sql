-- Player Collection Stage 9: public cosmetic showcase.
-- Stores only the player's explicit showcase selection; ownership remains
-- authoritative in case_player_state and is revalidated by the Worker on write/read.

CREATE TABLE IF NOT EXISTS player_collection_showcase (
  telegram_id TEXT NOT NULL,
  slot INTEGER NOT NULL CHECK(slot BETWEEN 1 AND 5),
  kind TEXT NOT NULL CHECK(kind IN ('skin','avatar','frame','trail','music')),
  item_id TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (telegram_id, slot),
  UNIQUE (telegram_id, kind, item_id)
);

CREATE INDEX IF NOT EXISTS idx_player_collection_showcase_player_updated
ON player_collection_showcase(telegram_id, updated_at DESC, slot);
