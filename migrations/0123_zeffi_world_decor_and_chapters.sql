-- Additive-only: earned DECOR (never buildings) and permanent city chapters.
-- Apply BEFORE deploying Worker code and assigning World decor in CC.
CREATE TABLE IF NOT EXISTS zeffi_world_decor_grants (
  telegram_id TEXT NOT NULL,
  source_key TEXT NOT NULL,
  decor_id TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK(amount BETWEEN 1 AND 20),
  created_at INTEGER NOT NULL,
  PRIMARY KEY(telegram_id,source_key)
);
CREATE INDEX IF NOT EXISTS idx_world_decor_grants_item ON zeffi_world_decor_grants(telegram_id,decor_id);
CREATE TABLE IF NOT EXISTS zeffi_world_decor_owned (
  telegram_id TEXT NOT NULL,
  decor_id TEXT NOT NULL,
  total INTEGER NOT NULL CHECK(total BETWEEN 0 AND 1000000),
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(telegram_id,decor_id)
);
CREATE TABLE IF NOT EXISTS zeffi_world_chapter_claims (
  telegram_id TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','claimed')),
  claimed_at INTEGER NOT NULL,
  PRIMARY KEY(telegram_id,chapter_id)
);
CREATE TABLE IF NOT EXISTS zeffi_world_seasonal_case_decor (
  case_id TEXT NOT NULL,
  item_key TEXT NOT NULL,
  decor_id TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 1 CHECK(amount BETWEEN 1 AND 20),
  weight REAL NOT NULL CHECK(weight>0 AND weight<=100000),
  rarity TEXT NOT NULL DEFAULT 'seasonal',
  title TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  PRIMARY KEY(case_id,item_key)
);
CREATE INDEX IF NOT EXISTS idx_world_seasonal_case_decor ON zeffi_world_seasonal_case_decor(case_id,enabled);
