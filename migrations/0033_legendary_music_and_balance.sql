-- v0.79.8: four new legendary music rewards and updated Legendary case category chances.
-- The complete chance object is written deliberately so the total remains exactly 100%.
INSERT INTO liveops_case_configs (
  case_id,
  enabled,
  title,
  guarantee_count,
  chances_json,
  ranges_json,
  updated_at,
  updated_by
)
VALUES (
  'legendary',
  1,
  'Легендарный кейс',
  50,
  '{"treats":25,"coffee":25,"points":39.665,"booster":0,"skin":0.35,"avatar":2,"frame":3,"trail":4.5,"music":0.45,"physical":0.035}',
  '{"treats":[250,1200],"coffee":[250,1200],"points":[35000,150000]}',
  unixepoch(),
  'migration-v0.79.8'
)
ON CONFLICT(case_id) DO UPDATE SET
  chances_json = excluded.chances_json,
  updated_at = excluded.updated_at,
  updated_by = excluded.updated_by;
