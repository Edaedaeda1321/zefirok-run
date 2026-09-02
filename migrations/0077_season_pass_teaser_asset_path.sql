-- Repair the Season 2 level-50 teaser image after the asset catalog moved
-- from the old optimized bundle path to the canonical Season 3 folder.
UPDATE season_pass_teasers
SET image_url = '/assets/season/s3/minigame/currency/belkina_background_season3.png'
WHERE image_url = '/assets/optimized/v0.79.5/belkina_background_season3.png';
