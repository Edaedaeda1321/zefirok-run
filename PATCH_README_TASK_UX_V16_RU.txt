Сладкий Забег — Task UX v16
Дата: 2026-10-01

Что сделано
-----------
1. Внутриигровые уведомления о выполнении заданий.
   - server-authoritative gameTaskNotice теперь несёт структурированные rewardItems;
   - компактный баннер показывает название задания и реальные иконки наград;
   - несколько выполнений группируются;
   - во время активного забега/экрана результатов баннер ждёт безопасного момента;
   - startup может показать непрочитанное выполнение один раз за текущую сессию;
   - dedupe: kind + key + cycleKey.

2. Еженедельные задания.
   - вкладка Weekly уже была в серверной модели и runtime V15;
   - Task Hub runtime поднят до V16, встроенные CSS/JS в index.html пересинхронизированы;
   - фильтр "Еженедельные" находится между ежедневными и событиями.

3. Награды с реальными иконками.
   - очки, зефир, кофе, XP профиля, кейсы и конкретные бустеры отображаются отдельными reward chips;
   - final reward цепочки тоже использует иконки;
   - строковый rewardLabel сохранён как compatibility fallback.

4. Эмодзи в Task Hub заменены на игровые assets.
   - типы заданий, XP, таймеры, награды, получение, empty states, сезон и т.д.;
   - новые изображения не добавлялись: используются существующие production assets.

5. Исправлен claim UX / мерцание карточки.
   - /api/tasks/claim больше не строит тяжёлый полный state после успешной операции;
   - клиент сразу фиксирует подтверждённый claim локальным committed tombstone;
   - stale /api/tasks/state не может на полсекунды вернуть полученную карточку;
   - карточка схлопывается по высоте вместо прозрачного пустого блока;
   - host sync и state refresh выполняются в фоне;
   - pending остаётся честным pending и автоматически перепроверяется.

6. Верхняя карточка профиля.
   - "Ежедневные X / Y";
   - "Еженедельные X / Y";
   - выполненными считаются complete или claimed задания текущего цикла.

Файлы
-----
src/worker.js
assets/game-tasks.js
assets/game-tasks.css
index.html

Migration
---------
Новой migration нет.

Установка
---------
unzip -o "$HOME/Downloads/sweet-run-task-ux-v16-20261001.zip" -d .

git status
git diff --check
git add -A
git commit -m "Improve task notifications rewards and claim UX"
git push origin main
./update.sh

Проверки в рабочей копии
------------------------
- node --check assets/game-tasks.js
- node --check src/worker.js
- check-index-srcdoc.mjs PASS
- check-worker-module-syntax.mjs PASS
- check-operation-system.mjs: 424 PASS
- check-migrations.mjs: 107/107 PASS
- schema-contract.mjs PASS

Полный npm run check:fast в извлечённой рабочей копии не стартует из-за отсутствующего .github/workflows/production-gate.yml. Это ограничение локальной копии, а не ошибка патча.
