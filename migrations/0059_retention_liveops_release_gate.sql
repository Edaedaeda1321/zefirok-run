-- Retention Analytics, reusable LiveOps event templates and Release Gate 2.0 history.
-- Test Project Time Machine 2.0 reuses the existing isolated workspace/scenario schema.

CREATE TABLE IF NOT EXISTS liveops_event_templates (
  template_key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  duration_hours INTEGER NOT NULL DEFAULT 24 CHECK(duration_hours BETWEEN 1 AND 720),
  payload_json TEXT NOT NULL DEFAULT '{}',
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  system_template INTEGER NOT NULL DEFAULT 0 CHECK(system_template IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_liveops_event_templates_enabled
ON liveops_event_templates(enabled, sort_order, updated_at DESC);

CREATE TABLE IF NOT EXISTS release_gate_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL CHECK(status IN ('pass','review','fail')),
  critical_count INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  result_json TEXT NOT NULL DEFAULT '{}',
  change_set_id TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL DEFAULT '',
  duration_ms INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_release_gate_runs_created
ON release_gate_runs(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_release_gate_runs_change_set
ON release_gate_runs(change_set_id, created_at DESC);

INSERT OR IGNORE INTO liveops_event_templates
(template_key,title,description,duration_hours,payload_json,enabled,system_template,sort_order,created_at,updated_at,updated_by)
VALUES
('weekend_activity','Выходные в кафе','Короткое рейтинговое событие на выходные: Золотой кейс победителю и небольшая награда участникам.',48,
 '{"winnerReward":{"kind":"case","id":"gold","amount":1,"imageUrl":""},"participantReward":{"kind":"points","amount":500},"shop":{"products":{},"discounts":{}},"broadcasts":{"start":"🏁 Выходные в кафе начались! Участвуй в забегах и поднимайся в рейтинге.","end":"🏆 Выходные в кафе завершены. Проверь итог и награды!"}}',1,1,10,unixepoch(),unixepoch(),'migration-0059'),
('return_week','Неделя возвращения','Недельное LiveOps-событие для дополнительной активности. Не изменяет персональную comeback-логику Daily.',168,
 '{"winnerReward":{"kind":"case","id":"mythic","amount":1,"imageUrl":""},"participantReward":{"kind":"points","amount":750},"shop":{"products":{},"discounts":{}},"broadcasts":{"start":"💗 Неделя возвращения началась! Загляни к Зеффи и участвуй в общем рейтинге.","end":"✨ Неделя возвращения завершена. Спасибо, что снова заглянул в кафе!"}}',1,1,20,unixepoch(),unixepoch(),'migration-0059'),
('season_start','Старт сезона','Трёхдневное событие на запуск сезона: сильная награда победителю и обычный кейс участникам.',72,
 '{"winnerReward":{"kind":"case","id":"legendary","amount":1,"imageUrl":""},"participantReward":{"kind":"case","id":"small","amount":1},"shop":{"products":{},"discounts":{}},"broadcasts":{"start":"🌟 Новый сезон стартовал! Начинай забег и поднимайся в рейтинге события.","end":"🎉 Стартовое событие сезона завершено. Награды готовы!"}}',1,1,30,unixepoch(),unixepoch(),'migration-0059'),
('season_final','Финальная неделя сезона','Финальные 48 часов сезона: Легендарный кейс победителю и 1 000 очков участникам.',48,
 '{"winnerReward":{"kind":"case","id":"legendary","amount":1,"imageUrl":""},"participantReward":{"kind":"points","amount":1000},"shop":{"products":{},"discounts":{}},"broadcasts":{"start":"🔥 Финальный рывок сезона! Осталось совсем немного времени.","end":"🏆 Финальный рывок завершён. Сезонные результаты зафиксированы!"}}',1,1,40,unixepoch(),unixepoch(),'migration-0059'),
('holiday_cafe','Праздничное кафе','Праздничное событие на 48 часов с Мифическим кейсом победителю и небольшим подарком участникам.',48,
 '{"winnerReward":{"kind":"case","id":"mythic","amount":1,"imageUrl":""},"participantReward":{"kind":"zefir","amount":150},"shop":{"products":{},"discounts":{}},"broadcasts":{"start":"🎀 Праздничное кафе открыто! Участвуй в событии вместе с Зеффи.","end":"🎁 Праздничное событие завершено. Спасибо за участие!"}}',1,1,50,unixepoch(),unixepoch(),'migration-0059');
