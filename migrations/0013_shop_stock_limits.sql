-- 5.0.4: глобальные остатки товаров и скинов.

CREATE TABLE IF NOT EXISTS shop_stock_limits (
  scope_key TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK(category IN ('skins', 'prize')),
  product_id TEXT NOT NULL DEFAULT '',
  configured_limit INTEGER NOT NULL DEFAULT 0 CHECK(configured_limit >= 0),
  remaining INTEGER NOT NULL DEFAULT 0 CHECK(remaining >= 0),
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS shop_stock_consumptions (
  consumption_id TEXT PRIMARY KEY,
  scope_key TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('skins', 'prize')),
  product_id TEXT NOT NULL,
  telegram_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shop_stock_limits_category
ON shop_stock_limits(category, product_id);

CREATE INDEX IF NOT EXISTS idx_shop_stock_consumptions_scope
ON shop_stock_consumptions(scope_key, created_at DESC);
