СЛАДКИЙ ЗАБЕГ — ПЕРЕНОС ЗАДАНИЙ, ЭТАП 1–2
Дата: 2026-09-30

ИСТОЧНИК
Патч собран по актуальной пользовательской сборке:
Архив(20260930-121848).zip

Патч КУМУЛЯТИВНЫЙ: в нём сохранён предыдущий фикс зависшего состояния
«Проверяем выдачу», поэтому его можно накатывать как поверх исходной сборки,
так и поверх предыдущего task-claim patch.

ЧТО СДЕЛАНО

1. Аналитика заданий перенесена в игровой Task Hub
---------------------------------------------------
Раньше task_exposure_log обновлялся старым Telegram-интерфейсом showPlayerTasks().
После переноса заданий в игру этот экран почти не используется, поэтому метрики
«увидели / выполнили» становились неполными.

Теперь /api/tasks/state после расчёта server-authoritative прогресса:
- записывает first_seen_at / last_seen_at;
- сохраняет текущие progress_value / target_value;
- фиксирует completed_at при первом наблюдении выполненного задания;
- использует тот же cycle_key, что и игровое задание;
- пишет только обычные игровые task из automation_chains (как и существующая аналитика);
- выполняет компактный multi-row UPSERT чанками вместо отдельного D1-запроса на каждое задание;
- не ломает загрузку Task Hub, если аналитическая запись временно не удалась.

Дополнительного клиентского API-запроса для аналитики НЕ добавлено: запись встроена
в уже существующий /api/tasks/state.

2. Подключён /api/tasks/read
----------------------------
Backend read-flow уже существовал, но новый игровой интерфейс его не вызывал.

Теперь assets/game-tasks.js и встроенная копия в index.html:
- после реального отображения выполненных unread-заданий отправляют /api/tasks/read;
- отправляют только задания, видимые в текущем фильтре;
- не делают запрос, если unread выполненных заданий нет;
- после успешного ответа локально снимают unread, чтобы не отправлять повторные запросы;
- если read-запрос временно не удался, Task Hub продолжает работать, а отметка повторится
  при следующем актуальном открытии/обновлении.

Backend /api/tasks/read дополнительно усилен:
- принимает только kind=task/series;
- проверяет key/cycleKey;
- отмечает прочитанными только реально завершённые player_game_tasks (completed_at > 0);
- не перезаписывает уже установленный read_at;
- state/read больше не запускают runtime DDL ensure-схемы: production migrations уже
  являются источником схемы. Claim-flow оставлен с прежними safety guards.

ЧТО НЕ ТРОГАЛИ
- Старый Telegram UI заданий пока не удалён — это следующий отдельный этап.
- Логику выдачи наград и server-authoritative claim не переносили на клиент.
- task_series / player_task_claims / player_game_tasks / automation_chains не меняли по схеме.
- Новых API startup-запросов не добавляли.

БАЗА / MIGRATIONS
Новая migration НЕ нужна.
Используются уже существующие таблицы:
- task_exposure_log — migration 0030_admin_operations_suite.sql;
- player_game_tasks — migration 0103_game_task_hub.sql.

ИЗМЕНЁННЫЕ ФАЙЛЫ
- src/worker.js
- assets/game-tasks.js
- index.html
- assets/game-tasks.css
  (CSS включён в кумулятивный патч, потому что содержит стиль кнопки
   «Проверить выдачу» из предыдущего фикса.)

ПРОВЕРКИ
PASSED:
- node --check src/worker.js
- node --check assets/game-tasks.js
- node scripts/check-index-srcdoc.mjs
- node --experimental-vm-modules scripts/check-worker-module-syntax.mjs
- node scripts/check-operation-system.mjs
- node scripts/check-migrations.mjs
- embedded game-tasks runtime в index.html полностью совпадает со standalone assets/game-tasks.js
- representative SQLite test для analytics UPSERT и read_at semantics
- git diff --no-index --check по изменённым файлам

КАК ПРИМЕНИТЬ
Распаковать содержимое архива поверх корня актуального проекта с сохранением путей.

После применения:
  git status
  git diff --check
  git add -A
  git commit -m "Move task analytics and read state into game hub"
  git push origin main
  ./update.sh

ВАЖНО
Не использовать npx wrangler deploy как стандартный production deploy проекта.
