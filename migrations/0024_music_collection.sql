-- Music collection and selected background track.
ALTER TABLE case_player_state
  ADD COLUMN owned_music_json TEXT NOT NULL DEFAULT '["cafe_run"]';

ALTER TABLE case_player_state
  ADD COLUMN active_music_id TEXT NOT NULL DEFAULT 'cafe_run';
