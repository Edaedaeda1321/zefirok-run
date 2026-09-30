СЛАДКИЙ ЗАБЕГ — ФИНАЛЬНЫЙ ПАТЧ ПЕРЕНОСА ЗАДАНИЙ В ИГРУ
Дата: 2026-09-30

Этот патч кумулятивный: он включает предыдущие исправления Task Hub
(recovery зависших claim, игровую аналитику просмотра заданий и read/unread)
и финальную зачистку старой player-side реализации заданий в Telegram-боте.

ИЗМЕНЁННЫЕ ФАЙЛЫ
- src/worker.js
- assets/game-tasks.js
- assets/game-tasks.css
- index.html

ЧТО СДЕЛАНО В ФИНАЛЬНОЙ ЗАЧИСТКЕ
1. Удалён старый Telegram UI событийных заданий:
   - showPlayerTasks()
   - showPlayerSeasonTasks()
   - botSeasonTaskStatus()
   - связанный formatter v71TaskProgressText()

2. Удалён старый Telegram claim обычного задания:
   - claimPlayerTask()

3. Удалена старая player-side Telegram реализация серий:
   - v77AppendPlayerSeries()
   - claimV77Series()

4. Удалён старый bot-only writer аналитики:
   - v77TrackTaskExposure()
   Аналитика теперь записывается из /api/tasks/state игрового Task Hub.

5. Сохранена совместимость со старыми сообщениями Telegram.
   Старые callback-кнопки:
   - tasks_hub
   - tasks_season
   - tasks_events
   - tasks_refresh
   - tasks_page:...
   - task_claim:...
   - v77_series_claim:...
   больше ничего не считают и не выдают. Они только открывают новый Task Hub.

6. v77PlayerSeriesState() оставлен намеренно — его использует новая игровая
   server-authoritative система серий заданий.

7. Админская система создания/редактирования заданий и серий не удалялась.
   automation_chains, task_series и связанные production-таблицы остаются.

8. Никакая критическая выдача не перенесена на клиент.
   Получение наград остаётся через /api/tasks/claim и reward delivery queue.

MIGRATION
Новая migration не требуется.

УСТАНОВКА
Скачать ZIP в папку Downloads и выполнить из КОРНЯ проекта:

unzip -o "$HOME/Downloads/sweet-run-task-transfer-final-20260930.zip" -d .

После установки:

git status
git diff --check
git add -A
git commit -m "Finish moving player tasks into game"
git push origin main
./update.sh

ПРОВЕРКИ ПАТЧА
- node --check src/worker.js: OK
- strict Worker module syntax: OK
- operation system checks: OK (424)
- migration history: OK (102 files)
- assets/game-tasks.js syntax: OK
- index srcdoc integrity: OK
- diff whitespace check: OK

Полный npm run check:fast в исходной ZIP-сборке не запускается из-за отсутствующего
.github/workflows/production-gate.yml в самой переданной сборке. Это ограничение
исходного архива, не ошибка данного патча.
