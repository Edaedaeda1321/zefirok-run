-- Authoritative per-run snapshot for the one-run "Pause Zeffi" booster.
ALTER TABLE game_run_sessions ADD COLUMN booster_pause INTEGER NOT NULL DEFAULT 0;
