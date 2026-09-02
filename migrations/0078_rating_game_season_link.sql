-- Link leaderboard seasons to the canonical game/Season Pass season without
-- renaming historical leaderboard IDs. A primary rating is unique among live
-- rows of one game season; cancelled/ended rows remain as history.
ALTER TABLE leaderboard_seasons ADD COLUMN game_season_id TEXT NOT NULL DEFAULT '';
ALTER TABLE leaderboard_seasons ADD COLUMN rating_kind TEXT NOT NULL DEFAULT 'special' CHECK (rating_kind IN ('primary','special'));

CREATE INDEX IF NOT EXISTS idx_leaderboard_seasons_game_season
ON leaderboard_seasons(game_season_id, rating_kind, status, starts_at, ends_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_one_live_primary_per_game_season
ON leaderboard_seasons(game_season_id)
WHERE game_season_id <> ''
  AND rating_kind = 'primary'
  AND finalized_at IS NULL
  AND status IN ('scheduled','active');
