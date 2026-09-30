СЛАДКИЙ ЗАБЕГ — ЗАДАНИЯ, ЭТАП 2: УВЕДОМЛЕНИЯ И BADGE
Дата: 2026-09-30

ПРЕДПОСЫЛКА
Патч рассчитан на уже установленный этап 1 типов заданий (migration 0104_game_task_types_stage1.sql).
Новой migration в этапе 2 нет.

ИЗМЕНЁННЫЕ PRODUCTION-ФАЙЛЫ
- src/worker.js
- index.html
- assets/game-tasks.js
- assets/game-tasks.css

Дополнительно ZIP содержит предыдущий D1 integration hotfix:
- scripts/fixtures/d1_pre_0087_snapshot.sql
Его повторная установка безопасна; файл идентичен предыдущему hotfix.

ЧТО СДЕЛАНО
1. В /api/game/startup добавлен bounded gameTaskNotice.
   - readyCount: количество готовых наград;
   - unreadCount: количество новых выполненных заданий;
   - activeCount: количество активных незавершённых заданий.
   Клиент не делает отдельный startup-запрос ради badge.

2. Кнопка «Задания» на главном экране получает server-authoritative badge уже после startup.
   - badge показывает количество готовых наград;
   - новое непрочитанное выполнение подсвечивается лёгкой анимацией;
   - текст кнопки показывает новые задания / готовые награды / активные задания.
   prefers-reduced-motion отключает анимацию.

3. После авторитетного завершения забега Worker определяет задания, которые пересекли target ИМЕННО этим забегом.
   - клиентский score/progress не используется как источник истины;
   - run-ledger типы читаются из player_economy_run_ledger;
   - accepted_runs / total_score используют leaderboard_runs;
   - best_score / level_reached используют серверный профиль;
   - текущий run исключается из BEFORE-снимка, поэтому повторный submit не создаёт повторное уведомление.

4. В результатах забега появляется уведомление «Задание выполнено!».
   При одном задании показываются название и награда; при нескольких — общий счётчик.

5. Если этим забегом выполнено хотя бы одно обычное задание, в результатах появляется кнопка
   «Посмотреть задания», открывающая игровой Task Hub.

6. Badge обновляется сразу из run settlement response через delta, без нового /api/tasks/state запроса.

7. Повторная отправка уже принятого run возвращает абсолютный gameTaskNotice,
   чтобы после потерянного первого HTTP-ответа badge всё равно восстановился.

8. Награда теперь snapshot-ится в player_game_tasks в момент фиксации выполнения.
   Это делает выполненную daily/event награду доступной даже если публикация задания закончилась
   до того, как игрок открыл Task Hub. Старые receipts с пустым reward_json автоматически backfill-ятся.

9. Сохранённое выполненное задание без начатого claim больше не показывается как
   «Проверяем выдачу». Оно отображается как обычная готовая к получению награда.
   «Проверяем выдачу» остаётся только для реального claim со status='pending'.

10. Аналитика task_exposure_log по-прежнему записывается только при открытии Task Hub.
    Startup badge не считается показом списка заданий и не искажает exposure-аналитику.

ЧТО НЕ ВХОДИТ В ЭТАП 2
- уведомления о завершении task_series / цепочек (этап 3);
- Telegram push об окончании событий/цепочек (этап 3);
- skin / booster / specific-case task types (этап 3).

MIGRATION
Новой migration НЕТ.
Если 0104 из этапа 1 ещё не применена на Production D1, её нужно применить отдельно
перед production deploy по инструкции этапа 1.

УСТАНОВКА
Скачать ZIP в Downloads и выполнить из КОРНЯ проекта:

unzip -o "$HOME/Downloads/sweet-run-task-notifications-stage2-20260930.zip" -d .

После установки:

git status
git diff --check
git add -A
git commit -m "Add game task completion notifications"
git push origin main
./update.sh

ПРОВЕРКИ
- node --check src/worker.js: OK
- node --check assets/game-tasks.js: OK
- strict Worker module syntax: OK
- index srcdoc integrity: OK
- embedded executable JS parse: OK (17 scripts)
- embedded Task Hub CSS/JS совпадает со standalone assets: OK
- operation system checks: OK (424)
- migration history: OK (103 files / 103 checksums)
- static schema contract: OK
- whitespace diff check: OK

ОГРАНИЧЕНИЯ ЛОКАЛЬНОЙ ПРОВЕРКИ
- npm run check:fast не стартует на переданной ZIP-сборке, потому что в ней отсутствует
  .github/workflows/production-gate.yml.
- check-d1-integration / локальный wrangler D1 запуск в текущем контейнере упирается в timeout
  запуска wrangler. Этап 2 не добавляет новую migration; production ./update.sh остаётся финальным gate.
