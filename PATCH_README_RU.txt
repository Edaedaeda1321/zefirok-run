Сладкий Забег — Task Hub UI: цепочки, события, кнопка «Задания»
Дата: 2026-09-30

Патч продолжает предыдущий Task Hub UI и НЕ меняет экономическую логику выдачи наград.
Server-authoritative claim/progress остаются в Worker/D1.

Изменено:
1) Цепочки заданий
- отдельная карточка цепочки вместо обычной task-card;
- прогресс «выполнено этапов N / M»;
- дорожка этапов: выполнено / текущий / заблокированный;
- текущий этап с его собственным прогрессом;
- отображается порядок прохождения: «По порядку» / «В любом порядке»;
- отображается срок цепочки, если он задан;
- финальная награда всегда вынесена в отдельный блок;
- ready/pending/claimed продолжают иметь приоритет над обычным статусом.

2) Событийные задания
- отдельный event-style карточки;
- постоянная визуальная идентичность «Событийное задание»;
- таймер до конца события;
- отдельное оформление награды события;
- при <= 3 часов используется urgent-state;
- статус ГОТОВО / ПРОВЕРКА ВЫДАЧИ / ПОЛУЧЕНО остаётся главнее типа задания.

3) Кнопка «Задания» на главной
- badge показывает именно количество готовых наград;
- отдельная метка «НОВОЕ ✨» показывает unread completion;
- после открытия Task Hub unread-маркер исчезает через уже существующий /api/tasks/read;
- состояние с готовыми наградами выделяется золотистым акцентом;
- новое выполнение получает лёгкий pulse с поддержкой prefers-reduced-motion;
- подпись кнопки показывает активные задания / ожидающие награды без нового API-запроса;
- aria-label синхронизируется с состоянием.

Backend:
- /api/tasks/state теперь дополнительно отдаёт presentation-only данные этапов серии:
  seriesMode, done/current/locked, progress/target, triggerType/progressFormat для каждого шага.
- Дополнительных D1-запросов для этого нет: используются данные, которые уже вычисляет v77PlayerSeriesState().

Файлы:
- index.html
- src/worker.js
- PATCH_README_RU.txt

Migration:
- НЕ требуется.

Установка из корня проекта после скачивания ZIP в ~/Downloads:
unzip -o "$HOME/Downloads/sweet-run-task-hub-series-events-main-button-20260930.zip" -d .

Дальше:
git status
git diff --check
git add -A
git commit -m "Improve task series events and main button UI"
git push origin main
./update.sh

Проверки перед упаковкой:
- task runtime JS: node --check — OK
- src/worker.js: node --check — OK
- check-index-srcdoc.mjs — OK
- check-worker-module-syntax.mjs --experimental-vm-modules — OK
- check-operation-system.mjs — OK (424)
- check-migrations.mjs — OK (105/105)
- check-database-schema.mjs --contract-only — OK
