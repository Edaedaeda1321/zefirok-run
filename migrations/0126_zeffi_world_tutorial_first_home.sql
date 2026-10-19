-- New-city-only mandatory house tutorial. Existing player cities and tutorial rows are untouched.
-- activated_at is recorded at migration application, so pre-existing cities are grandfathered.
CREATE TABLE IF NOT EXISTS zeffi_world_tutorial_v2_activation (
 id INTEGER PRIMARY KEY CHECK (id=1),
 activated_at INTEGER NOT NULL CHECK (activated_at>0)
);
INSERT OR IGNORE INTO zeffi_world_tutorial_v2_activation(id,activated_at) VALUES(1,unixepoch());
CREATE TABLE IF NOT EXISTS zeffi_world_tutorial_v2 (
 telegram_id TEXT PRIMARY KEY NOT NULL,
 home_uid TEXT NOT NULL DEFAULT '' CHECK(home_uid='' OR home_uid GLOB 'obj-[1-9]*'),
 free_skip_used INTEGER NOT NULL DEFAULT 0 CHECK(free_skip_used IN (0,1)),
 updated_at INTEGER NOT NULL DEFAULT 0 CHECK(updated_at>=0)
);
