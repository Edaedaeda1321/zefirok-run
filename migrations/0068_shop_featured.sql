CREATE TABLE IF NOT EXISTS shop_featured_slots (
  slot_key TEXT PRIMARY KEY CHECK(slot_key IN ('case','skin')),
  item_id TEXT NOT NULL DEFAULT '',
  badge_text TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT NOT NULL DEFAULT ''
);

INSERT OR IGNORE INTO shop_featured_slots(slot_key,item_id,badge_text,updated_at,updated_by) VALUES
  ('case','case-alex','Рекомендуем · Особый · Алекс',unixepoch(),'migration'),
  ('skin','alex','Рекомендуем · Легендарный',unixepoch(),'migration');
