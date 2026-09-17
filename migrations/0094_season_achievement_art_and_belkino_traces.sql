-- Season achievements: enable Season 3 rabbit-trace achievement series.
-- The achievement runtime already derives season dates from season_pass_seasons;
-- this migration only ensures the authored Season 3 collectible configuration exists.

UPDATE season_pass_seasons
SET visuals_json = json_set(
  COALESCE(NULLIF(TRIM(visuals_json), ''), '{}'),
  '$.battlePass.storyCollectible.enabled', 1,
  '$.battlePass.storyCollectible.id', COALESCE(
    NULLIF(json_extract(COALESCE(NULLIF(TRIM(visuals_json), ''), '{}'), '$.battlePass.storyCollectible.id'), ''),
    'rabbit-trace'
  ),
  '$.battlePass.storyCollectible.title', COALESCE(
    NULLIF(json_extract(COALESCE(NULLIF(TRIM(visuals_json), ''), '{}'), '$.battlePass.storyCollectible.title'), ''),
    'Следы Белого Кролика'
  ),
  '$.battlePass.storyCollectible.iconUrl', COALESCE(
    NULLIF(json_extract(COALESCE(NULLIF(TRIM(visuals_json), ''), '{}'), '$.battlePass.storyCollectible.iconUrl'), ''),
    '/assets/season-pass/quest_white_rabbit_s4.webp'
  ),
  '$.battlePass.storyCollectible.pickupText', COALESCE(
    NULLIF(json_extract(COALESCE(NULLIF(TRIM(visuals_json), ''), '{}'), '$.battlePass.storyCollectible.pickupText'), ''),
    'След Белого Кролика найден!'
  ),
  '$.battlePass.storyCollectible.reactionText', COALESCE(
    NULLIF(json_extract(COALESCE(NULLIF(TRIM(visuals_json), ''), '{}'), '$.battlePass.storyCollectible.reactionText'), ''),
    'Белый Кролик точно был здесь. Продолжай искать золотые следы.'
  ),
  '$.battlePass.storyCollectible.perRun', COALESCE(
    json_extract(COALESCE(NULLIF(TRIM(visuals_json), ''), '{}'), '$.battlePass.storyCollectible.perRun'),
    1
  ),
  '$.battlePass.storyCollectible.showAfterRun', COALESCE(
    json_extract(COALESCE(NULLIF(TRIM(visuals_json), ''), '{}'), '$.battlePass.storyCollectible.showAfterRun'),
    1
  ),
  '$.battlePass.storyCollectible.achievementSeries.enabled', 1,
  '$.battlePass.storyCollectible.achievementSeries.key', 'rabbit-trace',
  '$.battlePass.storyCollectible.achievementSeries.steps', json('[
    {"target":5,"title":"По следу"},
    {"target":25,"title":"Всё ближе"},
    {"target":50,"title":"Белый Кролик был здесь"}
  ]')
),
updated_at = CAST(strftime('%s','now') AS INTEGER),
updated_by = 'migration-0094-season-achievements'
WHERE season_id IN (
  SELECT season_id
  FROM season_pass_story_presets
  WHERE preset_id IN ('season3-belkino-story-v1','season3-belkino-story-v2-canonical')
)
OR title LIKE '%Белкино%'
OR title LIKE '%белкино%';
