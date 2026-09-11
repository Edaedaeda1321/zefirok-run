-- Explicit optimistic-concurrency guard for case_player_state writes.
-- Replaces the legacy case-opening rollback signal that intentionally wrote
-- an invalid active_booster_runs value to trip an unrelated CHECK constraint.
CREATE TABLE IF NOT EXISTS case_state_revision_guards (
  guard_id TEXT PRIMARY KEY,
  ok INTEGER NOT NULL CONSTRAINT case_state_revision_guard_ok CHECK(ok = 1)
);
