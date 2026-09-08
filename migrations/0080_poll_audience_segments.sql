-- 1.2.1 Poll audiences / Control Center player categories
-- Keeps legacy audience_type intact for already published polls and adds a
-- reference to the unified Control Center system/custom segment catalog.

ALTER TABLE player_polls
ADD COLUMN audience_segment_key TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_player_polls_audience_segment
ON player_polls(audience_segment_key, status, updated_at);
