ALTER TABLE player_polls ADD COLUMN answer_type TEXT NOT NULL DEFAULT 'choice' CHECK(answer_type IN ('choice','text','choice_comment'));
ALTER TABLE player_polls ADD COLUMN comment_mode TEXT NOT NULL DEFAULT 'none' CHECK(comment_mode IN ('none','optional','required'));
ALTER TABLE player_polls ADD COLUMN comment_min_length INTEGER NOT NULL DEFAULT 10 CHECK(comment_min_length >= 1 AND comment_min_length <= 500);
ALTER TABLE player_polls ADD COLUMN comment_max_length INTEGER NOT NULL DEFAULT 1000 CHECK(comment_max_length >= 10 AND comment_max_length <= 2000);
ALTER TABLE player_polls ADD COLUMN comment_prompt TEXT NOT NULL DEFAULT 'Напишите свой ответ сообщением.';

ALTER TABLE player_poll_responses ADD COLUMN comment_text TEXT NOT NULL DEFAULT '';
ALTER TABLE player_poll_responses ADD COLUMN comment_submitted_at INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_player_poll_comments_recent
ON player_poll_responses(poll_id, comment_submitted_at DESC)
WHERE comment_text <> '';
