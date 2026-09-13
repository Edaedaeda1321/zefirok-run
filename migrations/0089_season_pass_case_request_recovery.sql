-- Durable request identity for idempotent seasonal-case opening/recovery.
-- Existing production databases were created before open_request_id existed.
ALTER TABLE season_pass_case_grants
  ADD COLUMN open_request_id TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_season_pass_case_grants_request
  ON season_pass_case_grants(telegram_id,case_id,open_request_id);
