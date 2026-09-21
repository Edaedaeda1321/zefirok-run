-- Correct Alex case category chances after 0098.
-- Currency categories stay the most likely outcomes while cosmetic categories
-- retain their requested weights. Total category chance is exactly 100%.
UPDATE liveops_case_configs
SET chances_json = json_set(
      CASE WHEN json_valid(chances_json) THEN chances_json ELSE '{}' END,
      '$.skin', 10,
      '$.trail', 15,
      '$.frame', 12,
      '$.avatar', 13.5,
      '$.points', 16.5,
      '$.treats', 16.5,
      '$.coffee', 16.5,
      '$.booster', 0,
      '$.epicCosmetic', 0,
      '$.mythicCosmetic', 0,
      '$.legendaryCosmetic', 0,
      '$.music', 0,
      '$.physical', 0
    ),
    updated_at = unixepoch(),
    updated_by = 'alex-balance-v3-currency-priority'
WHERE case_id = 'alex';
