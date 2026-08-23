-- Legal documents runtime registry + owner control center.
-- The privacy document is bumped to 2026-08-13.2 so existing 2026-08-13.1 users receive a privacy-only acknowledgement gate.
-- Agreement and consent stay on 2026-08-13.1.

CREATE TABLE IF NOT EXISTS legal_document_registry (
  document_key TEXT PRIMARY KEY CHECK(document_key IN ('agreement','privacy','consent')),
  current_version TEXT NOT NULL,
  published_ru TEXT NOT NULL DEFAULT '',
  published_en TEXT NOT NULL DEFAULT '',
  draft_version TEXT NOT NULL DEFAULT '',
  draft_ru TEXT NOT NULL DEFAULT '',
  draft_en TEXT NOT NULL DEFAULT '',
  required INTEGER NOT NULL DEFAULT 1 CHECK(required IN (0,1)),
  published_at INTEGER NOT NULL DEFAULT 0,
  published_by TEXT NOT NULL DEFAULT '',
  published_by_name TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT NOT NULL DEFAULT '',
  updated_by_name TEXT NOT NULL DEFAULT ''
);

INSERT OR IGNORE INTO legal_document_registry(document_key,current_version,required,published_at,updated_at) VALUES
  ('agreement','2026-08-13.1',1,0,0),
  ('privacy','2026-08-13.2',1,0,0),
  ('consent','2026-08-13.1',1,0,0);

CREATE INDEX IF NOT EXISTS idx_legal_history_document_recent
ON legal_acceptance_history(document_key,document_version,accepted_at DESC,id DESC);
