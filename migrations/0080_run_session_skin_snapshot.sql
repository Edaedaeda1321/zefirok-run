-- Pin the equipped skin to the authoritative run session at run start.
-- Settlement must use this snapshot instead of whatever skin is equipped later.
ALTER TABLE game_run_sessions ADD COLUMN skin_id TEXT NOT NULL DEFAULT 'default';
