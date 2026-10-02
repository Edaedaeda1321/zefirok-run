-- Game Task Hub: login-day goals backed by authoritative daily_loyalty_activity.
-- 0111 is safe to revise before first production application because the release gate
-- failed during local D1 integration before remote migrations were touched.

INSERT INTO automation_chains(
  chain_key,title,description,enabled,trigger_type,trigger_value,
  action_type,action_json,show_as_task,task_mode,task_description,
  task_params_json,task_art_url,task_starts_at,task_ends_at,task_sort,
  cooldown_seconds,last_run_at,updated_at,updated_by
) VALUES
('task_daily_login_1','Ежедневная активность · Вход в игру','Открой игру сегодня, чтобы продолжить серию и забрать награду за вход.',1,'daily_logins',1,'reward','{"kind":"case","id":"small","amount":1,"profileXp":6,"reason":"Загляни в кафе"}',1,'daily','Открой игру сегодня, чтобы продолжить серию и забрать награду за вход.','{}','/assets/tasks/task_days.webp',0,0,66,0,0,unixepoch(),'migration-0111'),
('task_weekly_logins_5','Еженедельная активность · 5 входов','Заходи в игру в течение недели и поддерживай стабильную серию.',1,'daily_logins',5,'reward','{"kind":"case","id":"gold","amount":1,"profileXp":10,"reason":"Вернись 5 раз за неделю"}',1,'weekly','Заходи в игру в течение недели и поддерживай стабильную серию.','{}','/assets/tasks/task_days.webp',0,0,67,0,0,unixepoch(),'migration-0111'),
('task_total_logins_3','Коллекция входов · 3 дня','Зайди в игру 3 раза и открой первую награду за регулярность.',1,'daily_logins',3,'reward','{"kind":"case","id":"small","amount":1,"profileXp":8,"reason":"3 дня вместе с Зеффи"}',1,'one_time','Зайди в игру 3 раза и открой первую награду за регулярность.','{}','/assets/tasks/task_days.webp',0,0,68,0,0,unixepoch(),'migration-0111'),
('task_total_logins_7','Коллекция входов · 7 дней','Зайди в игру 7 раз и забери усиленную награду за активность.',1,'daily_logins',7,'reward','{"kind":"case","id":"gold","amount":1,"profileXp":12,"reason":"Неделя в кафе"}',1,'one_time','Зайди в игру 7 раз и забери усиленную награду за активность.','{}','/assets/tasks/task_days.webp',0,0,69,0,0,unixepoch(),'migration-0111'),
('task_total_logins_14','Коллекция входов · 14 дней','Зайди в игру 14 раз и открой престижную награду за постоянство.',1,'daily_logins',14,'reward','{"kind":"case","id":"mythic","amount":1,"profileXp":18,"reason":"Две недели с Зеффи"}',1,'one_time','Зайди в игру 14 раз и открой престижную награду за постоянство.','{}','/assets/tasks/task_days.webp',0,0,70,0,0,unixepoch(),'migration-0111')
ON CONFLICT(chain_key) DO UPDATE SET
  title=excluded.title,
  description=excluded.description,
  enabled=excluded.enabled,
  trigger_type=excluded.trigger_type,
  trigger_value=excluded.trigger_value,
  action_type=excluded.action_type,
  action_json=excluded.action_json,
  show_as_task=excluded.show_as_task,
  task_mode=excluded.task_mode,
  task_description=excluded.task_description,
  task_params_json=excluded.task_params_json,
  task_art_url=excluded.task_art_url,
  task_starts_at=excluded.task_starts_at,
  task_ends_at=excluded.task_ends_at,
  task_sort=excluded.task_sort,
  cooldown_seconds=excluded.cooldown_seconds,
  updated_at=excluded.updated_at,
  updated_by=excluded.updated_by;
