-- 4.0.8: роли сотрудников и журнал действий Telegram-бота.

-- Очередь безопасных компенсаций. Значения добавляются к актуальному балансу
-- из Telegram Mini App при следующей синхронизации, а не заменяют его.
ALTER TABLE admin_profile_state ADD COLUMN pending_wallet INTEGER NOT NULL DEFAULT 0;
ALTER TABLE admin_profile_state ADD COLUMN pending_treats INTEGER NOT NULL DEFAULT 0;
ALTER TABLE admin_profile_state ADD COLUMN pending_coffee INTEGER NOT NULL DEFAULT 0;

-- Перевод старых названий ролей на новые без потери существующих прав.
UPDATE staff_users SET role = 'cashier' WHERE role IN ('employee', 'cashier', 'kassir');
UPDATE staff_users SET role = 'administrator' WHERE role IN ('manager', 'admin', 'administrator');
UPDATE staff_users SET role = 'cook' WHERE role IN ('cook', 'povar');

-- Приводим разрешения к понятным ролевым наборам.
UPDATE staff_users SET
  can_redeem_rewards = 1,
  can_adjust_points = 0,
  can_manage_products = 0,
  can_publish_news = 0,
  can_manage_staff = 0,
  session_expires_at = 0
WHERE role = 'cashier';

UPDATE staff_users SET
  can_redeem_rewards = 0,
  can_adjust_points = 0,
  can_manage_products = 0,
  can_publish_news = 0,
  can_manage_staff = 0,
  session_expires_at = 0
WHERE role = 'cook';

UPDATE staff_users SET
  can_redeem_rewards = 1,
  can_adjust_points = 1,
  can_manage_products = 1,
  can_publish_news = 1,
  can_manage_staff = 1,
  session_expires_at = 0
WHERE role = 'administrator';

CREATE TABLE IF NOT EXISTS staff_action_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_telegram_id TEXT NOT NULL,
  actor_name TEXT NOT NULL DEFAULT '',
  actor_role TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  target_telegram_id TEXT,
  target_type TEXT,
  old_value INTEGER,
  new_value INTEGER,
  details_json TEXT,
  created_at INTEGER NOT NULL,
  success INTEGER NOT NULL DEFAULT 1 CHECK(success IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_staff_action_log_created
ON staff_action_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_staff_action_log_actor
ON staff_action_log(actor_telegram_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_staff_action_log_target
ON staff_action_log(target_telegram_id, created_at DESC);
