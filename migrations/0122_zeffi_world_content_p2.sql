-- Control Center P2: versioned editorial World projects, events, chapter copy and future resident requests.
-- No edits to community goals/contributions, player wallets, city JSON or existing claims.
CREATE TABLE IF NOT EXISTS zeffi_world_content_config (
 id INTEGER PRIMARY KEY CHECK(id=1),
 draft_revision INTEGER NOT NULL DEFAULT 0 CHECK(draft_revision>=0),
 published_revision INTEGER NOT NULL DEFAULT 0 CHECK(published_revision>=0),
 draft_json TEXT,
 published_json TEXT,
 last_request_id TEXT NOT NULL DEFAULT '',
 updated_by TEXT NOT NULL DEFAULT '',
 updated_at INTEGER NOT NULL DEFAULT 0,
 published_by TEXT NOT NULL DEFAULT '',
 published_at INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO zeffi_world_content_config(id) VALUES (1);
CREATE TABLE IF NOT EXISTS zeffi_world_content_audit (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 request_id TEXT NOT NULL UNIQUE,
 actor_id TEXT NOT NULL,
 action TEXT NOT NULL CHECK(action IN ('draft_save','publish','restore_draft')),
 draft_revision INTEGER NOT NULL,
 published_revision INTEGER NOT NULL,
 previous_json TEXT NOT NULL,
 next_json TEXT NOT NULL,
 reason TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 guard INTEGER NOT NULL CHECK(guard=1)
);
CREATE INDEX IF NOT EXISTS idx_zeffi_world_content_audit_at ON zeffi_world_content_audit(created_at DESC);
-- Future request rewards must use an assignment-time snapshot, not today's LiveOps configuration.
-- Older requests are backfilled with their historical fixed RC-3 prices.
CREATE TABLE IF NOT EXISTS zeffi_world_resident_terms (
 telegram_id TEXT NOT NULL,
 request_id TEXT NOT NULL,
 reward_points INTEGER NOT NULL CHECK(reward_points BETWEEN 0 AND 3000),
 reward_treats INTEGER NOT NULL CHECK(reward_treats BETWEEN 0 AND 30),
 content_revision INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(telegram_id,request_id),
 FOREIGN KEY(telegram_id,request_id) REFERENCES zeffi_world_resident_requests(telegram_id,request_id)
);
INSERT OR IGNORE INTO zeffi_world_resident_terms(telegram_id,request_id,reward_points,reward_treats,content_revision)
SELECT telegram_id,request_id,
 CASE template_id WHEN 'flowers' THEN 100 WHEN 'park' THEN 300 WHEN 'road' THEN 150 WHEN 'comfort' THEN 200 WHEN 'cafe' THEN 400 WHEN 'neighbors' THEN 250 ELSE 0 END,
 CASE template_id WHEN 'park' THEN 1 WHEN 'cafe' THEN 2 ELSE 0 END,0
FROM zeffi_world_resident_requests WHERE template_id IN ('flowers','park','road','comfort','cafe','neighbors');
