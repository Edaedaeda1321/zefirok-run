-- 5.1: серверный снимок коллекции скинов для карточки игрока в Telegram-боте.
ALTER TABLE case_player_state
ADD COLUMN owned_skins_json TEXT NOT NULL DEFAULT '[]';

ALTER TABLE case_player_state
ADD COLUMN active_skin_id TEXT NOT NULL DEFAULT '';
