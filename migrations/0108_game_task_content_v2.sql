-- Game Task Hub content v2: balanced daily/weekly/one-time goals and permanent task series.
-- Every managed task has explicit profileXp in addition to its main reward.
-- Weekly tasks use a 15 minute visibility buffer so the migration can be applied safely before Worker deploy.

UPDATE automation_chains
SET enabled=0,show_as_task=0,updated_at=unixepoch(),updated_by='migration-0108'
WHERE chain_key IN ('bot_daily_runs_3','bot_daily_runs_7','bot_daily_score_5000','bot_daily_score_15000','bot_daily_case_1','bot_daily_case_3','bot_milestone_best_10000','bot_milestone_level_10','bot_milestone_level_20','bot_milestone_promo_1');

INSERT INTO automation_chains(chain_key,title,description,enabled,trigger_type,trigger_value,action_type,action_json,show_as_task,task_mode,task_description,task_params_json,task_art_url,task_starts_at,task_ends_at,task_sort,cooldown_seconds,last_run_at,updated_at,updated_by) VALUES
('task_daily_runs_3','Утренняя пробежка','Заверши 3 забега сегодня.',1,'completed_runs',3,'reward','{"kind":"points","amount":500,"profileXp":10,"reason":"Утренняя пробежка"}',1,'daily','Заверши 3 забега сегодня.','{}','',0,0,100,0,0,unixepoch(),'migration-0108'),
('task_daily_zefir_30','Сладкий урожай','Собери 30 зефирок за сегодняшние забеги.',1,'collect_zefir',30,'reward','{"kind":"coffee","amount":15,"profileXp":10,"reason":"Сладкий урожай"}',1,'daily','Собери 30 зефирок за сегодняшние забеги.','{}','',0,0,110,0,0,unixepoch(),'migration-0108'),
('task_daily_coffee_5','Кофе с собой','Собери 5 чашек кофе за сегодняшние забеги.',1,'collect_coffee',5,'reward','{"kind":"zefir","amount":15,"profileXp":10,"reason":"Кофе с собой"}',1,'daily','Собери 5 чашек кофе за сегодняшние забеги.','{}','',0,0,120,0,0,unixepoch(),'migration-0108'),
('task_daily_score_2000','Отличный забег','Набери 2 000 очков за один забег сегодня.',1,'single_run_score',2000,'reward','{"kind":"booster","id":"shield","amount":1,"profileXp":15,"reason":"Отличный забег"}',1,'daily','Набери 2 000 очков за один забег сегодня.','{}','',0,0,130,0,0,unixepoch(),'migration-0108'),
('task_daily_case_1','Открываем подарки','Открой любой кейс сегодня.',1,'opened_cases',1,'reward','{"kind":"points","amount":300,"profileXp":10,"reason":"Открываем подарки"}',1,'daily','Открой любой кейс сегодня.','{}','',0,0,140,0,0,unixepoch(),'migration-0108'),
('task_daily_no_booster_1','Без помощи','Заверши 1 забег без бустеров сегодня.',1,'runs_without_boosters',1,'reward','{"kind":"booster","id":"second_chance","amount":1,"profileXp":15,"reason":"Без помощи"}',1,'daily','Заверши 1 забег без бустеров сегодня.','{}','',0,0,150,0,0,unixepoch(),'migration-0108'),
('task_daily_play_600','Десять минут с Зеффи','Проведи суммарно 10 минут в завершённых забегах сегодня.',1,'play_time',600,'reward','{"kind":"booster","id":"pause","amount":1,"profileXp":15,"reason":"Десять минут с Зеффи"}',1,'daily','Проведи суммарно 10 минут в завершённых забегах сегодня.','{}','',0,0,160,0,0,unixepoch(),'migration-0108'),
('task_weekly_runs_25','Неделя на дорожке','Заверши 25 забегов за текущую неделю.',1,'completed_runs',25,'reward','{"kind":"case","id":"small","amount":1,"profileXp":40,"reason":"Неделя на дорожке"}',1,'weekly','Заверши 25 забегов за текущую неделю.','{}','',unixepoch()+900,0,200,0,0,unixepoch(),'migration-0108'),
('task_weekly_score_30000','Большой счёт','Набери суммарно 30 000 очков в завершённых забегах за неделю.',1,'total_run_score',30000,'reward','{"kind":"case","id":"sweet","amount":1,"profileXp":40,"reason":"Большой счёт"}',1,'weekly','Набери суммарно 30 000 очков в завершённых забегах за неделю.','{}','',unixepoch()+900,0,210,0,0,unixepoch(),'migration-0108'),
('task_weekly_zefir_150','Сладкий запас','Собери 150 зефирок за текущую неделю.',1,'collect_zefir',150,'reward','{"kind":"booster","id":"treats","amount":2,"profileXp":35,"reason":"Сладкий запас"}',1,'weekly','Собери 150 зефирок за текущую неделю.','{}','',unixepoch()+900,0,220,0,0,unixepoch(),'migration-0108'),
('task_weekly_coffee_30','Кофейная неделя','Собери 30 чашек кофе за текущую неделю.',1,'collect_coffee',30,'reward','{"kind":"booster","id":"coffee","amount":2,"profileXp":35,"reason":"Кофейная неделя"}',1,'weekly','Собери 30 чашек кофе за текущую неделю.','{}','',unixepoch()+900,0,230,0,0,unixepoch(),'migration-0108'),
('task_weekly_cases_5','Мастер кейсов','Открой 5 кейсов за текущую неделю.',1,'opened_cases',5,'reward','{"kind":"points","amount":2500,"profileXp":40,"reason":"Мастер кейсов"}',1,'weekly','Открой 5 кейсов за текущую неделю.','{}','',unixepoch()+900,0,240,0,0,unixepoch(),'migration-0108'),
('task_weekly_records_3','Рекордсмен недели','Установи 3 новых личных рекорда за текущую неделю.',1,'new_records',3,'reward','{"kind":"case","id":"gold","amount":1,"profileXp":50,"reason":"Рекордсмен недели"}',1,'weekly','Установи 3 новых личных рекорда за текущую неделю.','{}','',unixepoch()+900,0,250,0,0,unixepoch(),'migration-0108'),
('task_once_first_run','Первый шаг','Заверши свой первый забег.',1,'completed_runs',1,'reward','{"kind":"points","amount":250,"profileXp":5,"reason":"Первый шаг"}',1,'one_time','Заверши свой первый забег.','{}','',0,0,400,0,0,unixepoch(),'migration-0108'),
('task_once_runs_10','Разогрелись','Заверши 10 забегов.',1,'completed_runs',10,'reward','{"kind":"booster","id":"points","amount":1,"profileXp":15,"reason":"Разогрелись"}',1,'one_time','Заверши 10 забегов.','{}','',0,0,410,0,0,unixepoch(),'migration-0108'),
('task_once_runs_50','Опытный бегун','Заверши 50 забегов.',1,'completed_runs',50,'reward','{"kind":"case","id":"sweet","amount":1,"profileXp":40,"reason":"Опытный бегун"}',1,'one_time','Заверши 50 забегов.','{}','',0,0,420,0,0,unixepoch(),'migration-0108'),
('task_once_runs_100','Сладкий марафонец','Заверши 100 забегов.',1,'completed_runs',100,'reward','{"kind":"case","id":"gold","amount":1,"profileXp":75,"reason":"Сладкий марафонец"}',1,'one_time','Заверши 100 забегов.','{}','',0,0,430,0,0,unixepoch(),'migration-0108'),
('task_once_zefir_10','Первый сладкий запас','Собери 10 зефирок в завершённых забегах.',1,'collect_zefir',10,'reward','{"kind":"points","amount":250,"profileXp":5,"reason":"Первый сладкий запас"}',1,'one_time','Собери 10 зефирок в завершённых забегах.','{}','',0,0,440,0,0,unixepoch(),'migration-0108'),
('task_once_coffee_3','Кофейная остановка','Собери 3 чашки кофе в завершённых забегах.',1,'collect_coffee',3,'reward','{"kind":"zefir","amount":10,"profileXp":5,"reason":"Кофейная остановка"}',1,'one_time','Собери 3 чашки кофе в завершённых забегах.','{}','',0,0,450,0,0,unixepoch(),'migration-0108'),
('task_once_case_1','Первый кейс','Открой свой первый кейс.',1,'opened_cases',1,'reward','{"kind":"points","amount":500,"profileXp":10,"reason":"Первый кейс"}',1,'one_time','Открой свой первый кейс.','{}','',0,0,460,0,0,unixepoch(),'migration-0108'),
('task_once_score_1500','Хорошее начало','Набери 1 500 очков за один забег.',1,'single_run_score',1500,'reward','{"kind":"booster","id":"points","amount":1,"profileXp":10,"reason":"Хорошее начало"}',1,'one_time','Набери 1 500 очков за один забег.','{}','',0,0,470,0,0,unixepoch(),'migration-0108'),
('task_once_play_1800','Долгий путь','Проведи суммарно 30 минут в завершённых забегах.',1,'play_time',1800,'reward','{"kind":"booster","id":"pause","amount":2,"profileXp":25,"reason":"Долгий путь"}',1,'one_time','Проведи суммарно 30 минут в завершённых забегах.','{}','',0,0,480,0,0,unixepoch(),'migration-0108'),
('task_once_no_booster_5','Чистое мастерство','Заверши 5 забегов без бустеров.',1,'runs_without_boosters',5,'reward','{"kind":"booster","id":"shield","amount":1,"profileXp":25,"reason":"Чистое мастерство"}',1,'one_time','Заверши 5 забегов без бустеров.','{}','',0,0,490,0,0,unixepoch(),'migration-0108'),
('task_once_records_2','Охотник за рекордами','Установи 2 новых личных рекорда.',1,'new_records',2,'reward','{"kind":"points","amount":1500,"profileXp":25,"reason":"Охотник за рекордами"}',1,'one_time','Установи 2 новых личных рекорда.','{}','',0,0,500,0,0,unixepoch(),'migration-0108'),
('task_once_score_5000','Новая высота','Набери 5 000 очков за один забег.',1,'single_run_score',5000,'reward','{"kind":"case","id":"sweet","amount":1,"profileXp":35,"reason":"Новая высота"}',1,'one_time','Набери 5 000 очков за один забег.','{}','',0,0,510,0,0,unixepoch(),'migration-0108'),
('task_once_cases_10','Коллекционер','Открой 10 кейсов.',1,'opened_cases',10,'reward','{"kind":"booster","id":"second_chance","amount":2,"profileXp":30,"reason":"Коллекционер"}',1,'one_time','Открой 10 кейсов.','{}','',0,0,520,0,0,unixepoch(),'migration-0108'),
('task_once_level_10','Растём','Достигни 10 уровня профиля.',1,'level_reached',10,'reward','{"kind":"points","amount":1000,"profileXp":30,"reason":"Растём"}',1,'one_time','Достигни 10 уровня профиля.','{}','',0,0,530,0,0,unixepoch(),'migration-0108'),
('task_once_level_20','Уверенный игрок','Достигни 20 уровня профиля.',1,'level_reached',20,'reward','{"kind":"case","id":"sweet","amount":1,"profileXp":45,"reason":"Уверенный игрок"}',1,'one_time','Достигни 20 уровня профиля.','{}','',0,0,540,0,0,unixepoch(),'migration-0108'),
('task_once_level_35','Профи','Достигни 35 уровня профиля.',1,'level_reached',35,'reward','{"kind":"case","id":"gold","amount":1,"profileXp":75,"reason":"Профи"}',1,'one_time','Достигни 35 уровня профиля.','{}','',0,0,550,0,0,unixepoch(),'migration-0108'),
('task_once_level_50','Ветеран сезона','Достигни 50 уровня профиля.',1,'level_reached',50,'reward','{"kind":"case","id":"gold","amount":1,"profileXp":120,"reason":"Ветеран сезона"}',1,'one_time','Достигни 50 уровня профиля.','{}','',0,0,560,0,0,unixepoch(),'migration-0108')
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
  task_starts_at=excluded.task_starts_at,
  task_ends_at=excluded.task_ends_at,
  task_sort=excluded.task_sort,
  cooldown_seconds=excluded.cooldown_seconds,
  updated_at=excluded.updated_at,
  updated_by=excluded.updated_by;

INSERT INTO task_series(series_key,title,description,enabled,completion_mode,final_reward_json,task_mode,starts_at,ends_at,sort_order,created_at,updated_at,updated_by,art_url) VALUES
('series_first_day_zeffi','Первый день Зеффи','Познакомься с главными механиками «Сладкого Забега» и получи финальную награду.',1,'ordered','{"kind":"case","id":"sweet","amount":1,"profileXp":40,"reason":"Первый день Зеффи"}','one_time',0,0,50,unixepoch(),unixepoch(),'migration-0108',''),
('series_sweet_marathon','Сладкий марафон','Пройди серию испытаний на выносливость, мастерство и рекорды.',1,'ordered','{"kind":"case","id":"gold","amount":1,"profileXp":75,"reason":"Сладкий марафон"}','one_time',0,0,60,unixepoch(),unixepoch(),'migration-0108',''),
('series_player_path','Путь игрока','Развивай профиль от первых уровней до престижного 50 уровня.',1,'ordered','{"kind":"case","id":"mythic","amount":1,"profileXp":150,"reason":"Путь игрока"}','one_time',0,0,70,unixepoch(),unixepoch(),'migration-0108','')
ON CONFLICT(series_key) DO UPDATE SET
  title=excluded.title,
  description=excluded.description,
  enabled=excluded.enabled,
  completion_mode=excluded.completion_mode,
  final_reward_json=excluded.final_reward_json,
  task_mode=excluded.task_mode,
  starts_at=excluded.starts_at,
  ends_at=excluded.ends_at,
  sort_order=excluded.sort_order,
  updated_at=excluded.updated_at,
  updated_by=excluded.updated_by;

DELETE FROM task_series_steps WHERE series_key IN ('series_first_day_zeffi','series_sweet_marathon','series_player_path');
INSERT INTO task_series_steps(series_key,step_order,chain_key) VALUES
('series_first_day_zeffi',1,'task_once_first_run'),
('series_first_day_zeffi',2,'task_once_zefir_10'),
('series_first_day_zeffi',3,'task_once_coffee_3'),
('series_first_day_zeffi',4,'task_once_case_1'),
('series_first_day_zeffi',5,'task_once_score_1500'),
('series_sweet_marathon',1,'task_once_runs_10'),
('series_sweet_marathon',2,'task_once_play_1800'),
('series_sweet_marathon',3,'task_once_no_booster_5'),
('series_sweet_marathon',4,'task_once_records_2'),
('series_sweet_marathon',5,'task_once_score_5000'),
('series_player_path',1,'task_once_level_10'),
('series_player_path',2,'task_once_level_20'),
('series_player_path',3,'task_once_level_35'),
('series_player_path',4,'task_once_level_50');
