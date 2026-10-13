-- Closed RC: optional tutorial progress, isolated from money, city and shared fund.
-- Each mode has a monotonic next-step index; final index means completed/skipped.
CREATE TABLE IF NOT EXISTS zeffi_world_tutorial (
  telegram_id TEXT PRIMARY KEY NOT NULL,
  personal_step INTEGER NOT NULL DEFAULT 0 CHECK(personal_step BETWEEN 0 AND 6),
  story_step INTEGER NOT NULL DEFAULT 0 CHECK(story_step BETWEEN 0 AND 6),
  updated_at INTEGER NOT NULL CHECK(updated_at >= 0)
);
