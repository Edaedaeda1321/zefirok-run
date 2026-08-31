-- Season Pass level-purchase UX: agreed production unit price is 15,000 points.
-- Existing ownership/progress tables are unchanged; this only updates the active Season I config.
UPDATE season_pass_seasons
SET level_price_points = 15000,
    updated_at = unixepoch(),
    updated_by = 'migration-0073'
WHERE season_id = 'season-1-cafe-opening';
