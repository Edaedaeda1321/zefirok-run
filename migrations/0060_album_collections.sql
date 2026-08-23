-- Album Zeffi: configurable cosmetic collections, milestones and idempotent claims.
-- Player ownership remains authoritative in case_player_state; album tables only group existing items.

CREATE TABLE IF NOT EXISTS album_collections (
  collection_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  cover_url TEXT NOT NULL DEFAULT '',
  background_url TEXT NOT NULL DEFAULT '',
  accent_color TEXT NOT NULL DEFAULT '#d96f9b',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision >= 1),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  published_at INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL DEFAULT '',
  updated_by TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_album_collections_status_sort
ON album_collections(status, sort_order, updated_at DESC);

CREATE TABLE IF NOT EXISTS album_collection_items (
  collection_id TEXT NOT NULL,
  item_kind TEXT NOT NULL CHECK(item_kind IN ('avatar','frame','trail','skin','music')),
  item_id TEXT NOT NULL,
  required INTEGER NOT NULL DEFAULT 0 CHECK(required IN (0,1)),
  secret INTEGER NOT NULL DEFAULT 0 CHECK(secret IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  added_at INTEGER NOT NULL,
  added_by TEXT NOT NULL DEFAULT '',
  PRIMARY KEY(collection_id, item_kind, item_id)
);

CREATE INDEX IF NOT EXISTS idx_album_items_collection_sort
ON album_collection_items(collection_id, sort_order, item_kind, item_id);

CREATE INDEX IF NOT EXISTS idx_album_items_reverse_lookup
ON album_collection_items(item_kind, item_id, collection_id);

CREATE TABLE IF NOT EXISTS album_milestones (
  collection_id TEXT NOT NULL,
  milestone_id TEXT NOT NULL,
  threshold_percent INTEGER NOT NULL CHECK(threshold_percent BETWEEN 1 AND 100),
  title TEXT NOT NULL DEFAULT '',
  rewards_json TEXT NOT NULL DEFAULT '[]',
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT '',
  PRIMARY KEY(collection_id, milestone_id),
  UNIQUE(collection_id, threshold_percent)
);

CREATE INDEX IF NOT EXISTS idx_album_milestones_collection
ON album_milestones(collection_id, enabled, threshold_percent, sort_order);

CREATE TABLE IF NOT EXISTS album_milestone_claims (
  telegram_id TEXT NOT NULL,
  collection_id TEXT NOT NULL,
  milestone_id TEXT NOT NULL,
  threshold_percent INTEGER NOT NULL,
  rewards_json TEXT NOT NULL DEFAULT '[]',
  queue_ids_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','delivered','failed')),
  request_id TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  delivered_at INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(telegram_id, collection_id, milestone_id)
);

CREATE INDEX IF NOT EXISTS idx_album_claims_player
ON album_milestone_claims(telegram_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_album_claims_collection
ON album_milestone_claims(collection_id, milestone_id, status, created_at DESC);
