-- Permanent, idempotent ownership for the pass-only Meeting Garden.
-- The community garden keeps its existing fundraising tables untouched.
CREATE TABLE IF NOT EXISTS zeffi_world_pass_garden_ownership (
 telegram_id TEXT PRIMARY KEY,
 garden_id TEXT NOT NULL CHECK(garden_id='meeting-garden-pass'),
 source_season_id TEXT NOT NULL,
 source_level INTEGER NOT NULL CHECK(source_level BETWEEN 1 AND 50),
 source_lane TEXT NOT NULL CHECK(source_lane='premium'),
 granted_at INTEGER NOT NULL CHECK(granted_at>0)
);
