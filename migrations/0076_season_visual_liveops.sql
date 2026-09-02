-- LiveOps visual configuration for rating and Season Pass seasons.
-- Empty JSON keeps existing client artwork via built-in fallbacks.
ALTER TABLE leaderboard_seasons ADD COLUMN visuals_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE season_pass_seasons ADD COLUMN visuals_json TEXT NOT NULL DEFAULT '{}';
