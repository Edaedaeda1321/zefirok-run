-- Sweet Run - Fresh Systems Polish
-- Daily Loyalty/News/Mail/Rating/Cases: metadata and lightweight state only.

ALTER TABLE bot_news ADD COLUMN news_type TEXT NOT NULL DEFAULT 'update';
ALTER TABLE bot_news ADD COLUMN audience_segment_key TEXT NOT NULL DEFAULT 'all';
ALTER TABLE bot_news ADD COLUMN expires_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bot_news ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE bot_news ADD COLUMN cta_action TEXT NOT NULL DEFAULT '';
ALTER TABLE bot_news ADD COLUMN cta_label TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_bot_news_live_target
  ON bot_news(status, audience_segment_key, pinned DESC, published_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS player_news_read_events (
  telegram_id TEXT NOT NULL,
  news_id INTEGER NOT NULL,
  read_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (telegram_id, news_id)
);

CREATE INDEX IF NOT EXISTS idx_player_news_read_events_player
  ON player_news_read_events(telegram_id, read_at DESC);

ALTER TABLE player_mail_v3 ADD COLUMN cta_label TEXT NOT NULL DEFAULT '';
ALTER TABLE player_mail_v3 ADD COLUMN cta_url TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS leaderboard_player_views (
  telegram_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'season',
  last_place INTEGER NOT NULL DEFAULT 0,
  last_score INTEGER NOT NULL DEFAULT 0,
  viewed_at INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (telegram_id, season_id, mode)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_player_views_player
  ON leaderboard_player_views(telegram_id, viewed_at DESC);
