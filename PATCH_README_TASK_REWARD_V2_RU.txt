СЛАДКИЙ ЗАБЕГ — Task Reward Engine V2
Дата патча: 2026-10-01

ЦЕЛЬ
Убрать игровые задания Task Hub из старой общей reward_delivery_queue. После нажатия «Получить» награда теперь применяется сервером синхронно и идемпотентно, а клиент получает claimed:true и сразу убирает карточку из активных заданий.

ПЕРВОПРИЧИНА
Старая реализация Task Hub использовала цепочку:
Task Hub -> player_task_claims/player_task_series_claims -> reward_delivery_queue -> worker processing -> reconciliation -> повторная проверка клиентом.
Из-за этого обычная игровая награда попадала в общую фоновую очередь, появлялись состояния «Проверяем…» / «Проверка выдачи», задержки и повторные запросы состояния.

НОВАЯ СХЕМА
Task Hub
  -> серверная повторная проверка completion/cycle
  -> reward snapshot из player_game_tasks / серверной конфигурации
  -> Game Task Reward Engine V2
  -> атомарное применение награды в существующие authoritative-хранилища
  -> game_task_reward_claims(status=claimed)
  -> claimed:true

Новые claims игровых заданий НЕ создаются в reward_delivery_queue.
Старые player_task_claims, player_task_series_claims и reward_delivery_queue не удаляются: они остаются для совместимости и других систем.

ЧТО ДОБАВЛЕНО
1. migrations/0109_game_task_reward_engine_v2.sql
   - новая таблица game_task_reward_claims;
   - UNIQUE(telegram_id, kind, task_key, cycle_key) для идемпотентности;
   - backfill уже завершённых старых claims;
   - pending старой очереди намеренно не копируются слепо — они разбираются безопасно в момент claim.

2. src/worker.js
   - новый синхронный applyGameTaskRewardDirect;
   - новый claimGameTask без enqueueRewardDelivery/processPlayerRewardDeliveryQueue;
   - bulk backend: POST /api/tasks/claim с claims:[...], максимум 20;
   - Task Hub state больше не запускает reconciliation общей очереди;
   - старые pending claims совместимы с V2;
   - старые operation_id проверяются в reward_delivery_queue и reward_delivery_archive;
   - уже доставленная старая часть награды повторно не выдаётся;
   - недоставленные части выдаются напрямую;
   - старые незавершённые queue rows для этого task claim отменяются с инвалидированием lease;
   - reset/analytics/owner metrics/important task notifications переведены с учётом V2 claims.

3. assets/game-tasks.js + встроенная копия в index.html
   - версия Task Hub UI V17;
   - удалены пользовательские состояния pending/«Проверка выдачи»;
   - кнопка: «Получить» -> кратко «Получаем…» -> «Получено»;
   - после claimed:true карточка схлопывается и уходит в историю полученных;
   - реальная ошибка оставляет карточку доступной для повторной попытки.

4. scripts/check-game-task-reward-engine.mjs
   - отдельный regression-check новой архитектуры.

5. scripts/check-production-gate.mjs
   - новый check включён в production gate.

6. scripts/migration-history.lock.json
   - migration 0109 добавлена в lock.

SERVER-AUTHORITATIVE
Клиент передаёт только kind/key/cycleKey. Размер и тип награды клиентом не задаются.
Сервер повторно валидирует задание и применяет награду в существующие authoritative-хранилища:
- points -> admin_profile_state.pending_wallet;
- zefir -> admin_profile_state.pending_treats;
- coffee -> admin_profile_state.pending_coffee;
- profile XP -> admin_profile_state.profile_xp;
- cases -> granted_cases;
- boosters -> case_player_state.
Кейсы и бустеры не создают отдельную вторую экономику.

ПЕРЕХОД СО СТАРЫХ PENDING
Для зависшего старого claim V2 использует те же детерминированные legacy operation_id:
- если компонент уже отмечен delivered/claimed в старой queue/archive, он НЕ выдаётся повторно;
- если компонент ещё не доставлен, V2 выдаёт только его;
- незавершённая старая queue-запись для этого operation_id отменяется;
- новый receipt фиксируется как claimed.
Таким образом переход не требует удаления старых таблиц и не должен терять уже выданные награды.

BULK CLAIM
Backend уже поддерживает один запрос для нескольких готовых заданий. UI-кнопка «Получить все» в этот патч специально не добавлена, чтобы не расширять интерфейс до проверки базового V2 flow.

ВАЖНО: ПОРЯДОК ВЫКАТКИ
Новая migration должна быть применена ДО запуска Worker с этим кодом, потому что Worker читает game_task_reward_claims.
Migration аддитивная и совместима со старым Worker.

Рекомендуемый порядок из корня актуального репозитория:

  git status
  git diff --check
  node scripts/check-game-task-reward-engine.mjs
  node scripts/check-migrations.mjs
  node scripts/check-database-schema.mjs --contract-only
  node scripts/check-operation-system.mjs
  node scripts/check-production-gate.mjs --skip-d1

  git add -A
  git commit -m "Separate game task reward delivery"

  npx --yes wrangler@4.131.1 d1 migrations apply zefirok-rewards --remote
  git push origin main
  ./update.sh

Не использовать прямой `npx wrangler deploy` как production-flow. Production-деплой проекта остаётся через ./update.sh.

ПРОВЕРКИ ПАТЧА
На приложенной актуальной сборке успешно пройдены:
- node --check src/worker.js
- node --check assets/game-tasks.js
- strict Worker module syntax
- index srcdoc integrity
- Game Task Reward Engine V2 regression check
- migration history check
- schema contract static check
- operation system check
- SQL fixture migration/backfill/idempotency syntax
- whitespace diff check

Также ранее в этой сборке после изменений проходили связанные проверки case stability, Elite+ XP lifetime, mail claim, runner cases, story/achievements, asset/live-content authority и P1 read paths.

ОГРАНИЧЕНИЕ ПРОВЕРКИ АРХИВА
Переданный ZIP не содержит repository dotfiles `.github/workflows/production-gate.yml`, `.gitignore` и `.assetsignore`. Поэтому полный `npm run check:fast` внутри именно этого ZIP нельзя довести до конца: несколько repository-wiring checks закономерно падают на отсутствующих файлах. Это не ошибка Task Reward Engine V2. В настоящем checkout репозитория перед production push нужно запустить обычный production gate.

ФАЙЛЫ ПАТЧА
- src/worker.js
- assets/game-tasks.js
- index.html
- migrations/0109_game_task_reward_engine_v2.sql
- scripts/migration-history.lock.json
- scripts/check-game-task-reward-engine.mjs
- scripts/check-production-gate.mjs
- PATCH_README_TASK_REWARD_V2_RU.txt
- PATCH_SHA256SUMS.txt
