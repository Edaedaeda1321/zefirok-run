-- Alex case avatar rebalance.
-- The avatar category contains two equal-weight Alex avatars, so 27% total
-- gives each avatar a 13.5% ordinary-roll chance. Keep the full case at 100%
-- by reducing the three currency categories to 12% each.
UPDATE liveops_case_configs
SET chances_json = json_set(
      CASE WHEN json_valid(chances_json) THEN chances_json ELSE '{}' END,
      '$.skin', 10,
      '$.trail', 15,
      '$.frame', 12,
      '$.avatar', 27,
      '$.points', 12,
      '$.treats', 12,
      '$.coffee', 12,
      '$.booster', 0,
      '$.epicCosmetic', 0,
      '$.mythicCosmetic', 0,
      '$.legendaryCosmetic', 0,
      '$.music', 0,
      '$.physical', 0
    ),
    updated_at = unixepoch(),
    updated_by = 'alex-avatar-13_5-v1'
WHERE case_id = 'alex';
