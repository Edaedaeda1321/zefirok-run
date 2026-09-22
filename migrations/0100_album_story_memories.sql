-- Permanent story pages inside Album Zeffi.
-- A story album is bound to one Season Pass storyCollectible snapshot.
-- Player unlocks are snapshotted so finished seasons remain readable forever.

CREATE TABLE IF NOT EXISTS album_story_settings (
  collection_id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL,
  season_title TEXT NOT NULL DEFAULT '',
  collectible_id TEXT NOT NULL,
  source_milestones_json TEXT NOT NULL DEFAULT '[]',
  source_memory_total INTEGER NOT NULL DEFAULT 0 CHECK(source_memory_total >= 0),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS album_story_pages (
  collection_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  required_memories INTEGER NOT NULL CHECK(required_memories >= 1),
  title TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  story_text TEXT NOT NULL DEFAULT '',
  art_url TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT '',
  PRIMARY KEY(collection_id,page_id),
  UNIQUE(collection_id,required_memories)
);

CREATE TABLE IF NOT EXISTS album_story_unlocks (
  telegram_id TEXT NOT NULL,
  collection_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  required_memories INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL DEFAULT '{}',
  unlocked_at INTEGER NOT NULL,
  PRIMARY KEY(telegram_id,collection_id,page_id)
);

CREATE INDEX IF NOT EXISTS idx_album_story_settings_season
  ON album_story_settings(season_id,collection_id);
CREATE INDEX IF NOT EXISTS idx_album_story_pages_collection
  ON album_story_pages(collection_id,enabled,sort_order,required_memories,page_id);
CREATE INDEX IF NOT EXISTS idx_album_story_unlocks_player
  ON album_story_unlocks(telegram_id,unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_album_story_unlocks_collection
  ON album_story_unlocks(collection_id,page_id,unlocked_at DESC);
