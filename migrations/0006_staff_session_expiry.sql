ALTER TABLE staff_users
ADD COLUMN session_expires_at INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_staff_users_active_session
ON staff_users(active, session_expires_at);
