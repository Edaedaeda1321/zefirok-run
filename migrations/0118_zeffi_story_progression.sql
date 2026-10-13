-- Closed World Zeffi RC: server-authoritative story chapters, visits and events.
-- Uses the existing community fund and the same D1. No wallet/inventory changes.
CREATE TABLE IF NOT EXISTS zeffi_story_players (
  telegram_id TEXT PRIMARY KEY NOT NULL,
  chapter INTEGER NOT NULL DEFAULT 0 CHECK (chapter BETWEEN 0 AND 3),
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  -- Bit 0: Festival district; bit 1: White Rabbit story district.
  unlocked_mask INTEGER NOT NULL DEFAULT 0 CHECK (unlocked_mask BETWEEN 0 AND 3),
  updated_at INTEGER NOT NULL DEFAULT 0 CHECK (updated_at >= 0)
);
CREATE TABLE IF NOT EXISTS zeffi_story_visits (
  telegram_id TEXT NOT NULL,
  place_id TEXT NOT NULL CHECK (place_id IN (
    'square','cafe','belkino','friends','station','community-garden','festival','rabbit'
  )),
  visited_at INTEGER NOT NULL CHECK (visited_at > 0),
  PRIMARY KEY (telegram_id, place_id)
);
CREATE INDEX IF NOT EXISTS idx_zeffi_story_visits_player
 ON zeffi_story_visits(telegram_id, visited_at);
-- Global event availability is editable by future server-side content tooling.
-- Completion is ALWAYS derived from zeffi_community_projects, never a client flag.
CREATE TABLE IF NOT EXISTS zeffi_story_events (
  event_id TEXT PRIMARY KEY NOT NULL CHECK (event_id IN ('garden','festival')),
  project_id TEXT NOT NULL UNIQUE REFERENCES zeffi_community_projects(project_id),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
  updated_at INTEGER NOT NULL DEFAULT 0 CHECK (updated_at >= 0)
);
INSERT OR IGNORE INTO zeffi_story_events(event_id,project_id,enabled,updated_at)
 VALUES ('garden','garden',1,0),('festival','festival',1,0);
