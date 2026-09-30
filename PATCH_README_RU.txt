СЛАДКИЙ ЗАБЕГ — ЗАДАНИЯ, ЭТАП 3: КОНТЕКСТНЫЕ ЦЕЛИ И ВАЖНЫЕ УВЕДОМЛЕНИЯ
Дата: 2026-09-30

Что добавлено
=============

1. Новые server-authoritative типы игровых заданий:
   - runs_with_skin        — выполнить N забегов в выбранном образе;
   - runs_with_booster     — выполнить N забегов с выбранным бустером;
   - runs_without_boosters — выполнить N забегов без бустеров;
   - open_specific_case    — открыть N кейсов выбранного типа.

2. task_params_json теперь используется как структурированный параметр условия:
   - {"skinId":"alex"}
   - {"boosterType":"shield"}
   - {"caseType":"gold"}

   Значения проверяются сервером по реальным каталогам проекта. Клиент не может
   назначить себе прогресс или подменить неизвестный образ/бустер/кейс.

3. Owner-панель получила обычный select для образа / бустера / кейса.
   Ручное редактирование JSON для этих типов не требуется. Расширенный JSON-блок
   оставлен как совместимый фундамент для будущих условий.

4. Полный набор бустеров теперь сохраняется в run ledger отдельным полем
   run_booster_types_json. Это важно для utility-бустеров (щит, второй шанс,
   пауза), которые раньше не попадали в economy booster snapshot.

   Старые строки ledger намеренно остаются NULL: по ним нельзя достоверно узнать,
   был ли utility-бустер. Поэтому задание «без бустеров» считает только новые
   забеги с полноценным Stage 3 snapshot и не выдаёт ложный legacy-прогресс.

5. Прогресс новых типов считается только из authoritative серверных данных:
   - skin / booster / no-booster -> player_economy_run_ledger;
   - конкретный кейс -> level_case_openings + granted_cases.

6. Уведомления цепочек:
   - если забег или открытие кейса завершили последнюю недостающую ступень
     task_series, финальная награда серии сразу фиксируется в player_game_tasks;
   - после забега результат показывает «Цепочка завершена!»;
   - после открытия кейса игра показывает toast и обновляет badge «Задания».

7. Важные Telegram-уведомления (не спам):
   - завершена цепочка заданий;
   - выполнено событийное задание;
   - событийное задание, которое игрок уже видел и начал выполнять,
     заканчивается менее чем через 3 часа.

   Доставка использует существующие player_notification_queue, quiet hours,
   дневные лимиты и retry. Отдельная параллельная система доставки не создана.

8. Напоминание об окончании события отправляется только для незавершённой цели.
   Текст не утверждает, что уже заработанная награда исчезнет: завершённые
   награды остаются durable snapshot, как было сделано на этапе 2.

9. Добавлена durable dedupe/lease таблица game_task_notification_state.
   Она не хранит прогресс или награду, а только не даёт повторно отправлять
   важное Telegram-уведомление при нескольких cron-runner'ах / retry.

   Во время migration 0105 уже существующие completed receipts автоматически
   помечаются как ранее уведомлённые. Поэтому после деплоя Stage 3 бот не начнёт
   массово рассылать старые выполненные задания и цепочки.

10. Добавлены индексы для cron-read путей player_game_tasks/task_exposure_log,
    чтобы стоимость уведомлений не росла линейно вместе с историей игроков.

Миграции
========

Нужно применить две новые additive migration:

  migrations/0105_game_task_notifications_stage3.sql
  migrations/0106_game_task_notification_indexes.sql

Команда:

  npx --yes wrangler@4.131.1 d1 migrations apply zefirok-rewards --remote

0105 добавляет:
- nullable player_economy_run_ledger.run_booster_types_json
- game_task_notification_state
- idx_game_task_notification_state_updated
- anti-retroactive backfill для старых completed task receipts

0106 добавляет индексы для bounded notification reads.

Установка патча
===============

Из корня проекта, если ZIP лежит в ~/Downloads:

  unzip -o "$HOME/Downloads/sweet-run-task-stage3-context-notifications-20260930.zip" -d .

Далее:

  git status
  git diff --check
  npx --yes wrangler@4.131.1 d1 migrations apply zefirok-rewards --remote
  git add -A
  git commit -m "Add contextual game tasks and important notifications"
  git push origin main
  ./update.sh

Файлы патча
===========

- src/worker.js
- owner.html
- index.html
- migrations/0105_game_task_notifications_stage3.sql
- migrations/0106_game_task_notification_indexes.sql
- scripts/migration-history.lock.json
- scripts/fixtures/d1_pre_0087_snapshot.sql
- PATCH_README_RU.txt

Production safety
=================

- Награды и прогресс остаются server-authoritative.
- Не добавлен отдельный startup request.
- Telegram-уведомления переиспользуют существующую policy/queue систему.
- Новые task receipts используют существующий player_game_tasks.
- Claim/reward delivery flow не переносится на клиент.
- Новые миграции additive; существующие данные игроков не удаляются.
- D1 pre-0087 integration fixture дополнен исторической task_exposure_log,
  чтобы production gate мог последовательно применить 0087...0106.
