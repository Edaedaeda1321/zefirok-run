-- Task Hub art: per-task/per-series manual art overrides with server-side automatic fallbacks.
ALTER TABLE automation_chains
ADD COLUMN task_art_url TEXT NOT NULL DEFAULT '';

ALTER TABLE task_series
ADD COLUMN art_url TEXT NOT NULL DEFAULT '';
