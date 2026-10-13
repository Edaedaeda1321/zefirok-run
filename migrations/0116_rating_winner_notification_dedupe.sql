-- One Telegram winner notice per rating season. The notification queue already
-- implements leases, retries and terminal delivery status. Its normal 90-day
-- retention is safe because winner backfill is bounded to seven days.
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_notice_rating_winner_once
ON player_notification_queue(category)
WHERE category LIKE 'player_mail:rating_winner:%';
