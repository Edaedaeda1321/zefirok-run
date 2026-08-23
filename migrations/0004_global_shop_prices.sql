CREATE TABLE IF NOT EXISTS shop_prices (
  product_id TEXT PRIMARY KEY,
  points INTEGER NOT NULL DEFAULT 0 CHECK(points >= 0),
  treats INTEGER NOT NULL DEFAULT 0 CHECK(treats >= 0),
  coffee INTEGER NOT NULL DEFAULT 0 CHECK(coffee >= 0),
  version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);

INSERT OR IGNORE INTO shop_prices (
  product_id, points, treats, coffee, version, updated_at, updated_by
) VALUES
  ('zefir', 40000, 350, 0, 1, unixepoch(), 'migration'),
  ('americano', 65000, 0, 350, 1, unixepoch(), 'migration'),
  ('cappuccino', 75000, 0, 450, 1, unixepoch(), 'migration');
