-- Только чтение. Замените диагностику на отправку данных без Telegram ID,
-- если будете показывать результат третьим лицам.
SELECT id,title,status,datetime(finalized_at,'unixepoch') AS closed_at
FROM leaderboard_seasons ORDER BY starts_at DESC LIMIT 5;
SELECT category,status,attempts,substr(last_error,1,100) AS error,
       datetime(created_at,'unixepoch') AS queued_at,
       datetime(updated_at,'unixepoch') AS updated
FROM player_notification_queue
WHERE category LIKE 'rating_dethroned:%'
   OR category LIKE 'player_mail:rating_winner:%'
ORDER BY id DESC LIMIT 20;
