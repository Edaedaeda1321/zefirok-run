СЛАДКИЙ ЗАБЕГ — TASK HUB ART / STAGE 6
Дата: 2026-09-30

Что сделано
===========
1. Картинка теперь есть у каждой карточки задания в Task Hub:
   - обычные задания;
   - ежедневные;
   - событийные;
   - цепочки.

2. Для старых и новых заданий действует автоматический fallback-art по типу цели.
   Ничего вручную назначать для существующих заданий не обязательно.

3. Автоматический каталог использует уже существующие production-assets проекта:
   - забеги -> achievement runs art;
   - общий score -> total score art;
   - score за один забег -> best score art;
   - зефир -> zefir achievement art;
   - кофе -> coffee achievement art;
   - рекорды -> records art;
   - кейсы -> case art;
   - уровень -> level art;
   - покупки/магазин -> shop art;
   - конкретный skin -> реальный shop portrait выбранного skin;
   - конкретный booster -> реальный booster art;
   - конкретный case -> реальный closed-case art;
   - цепочки -> season-pass quest art;
   - неизвестный тип -> icon_quest_game.

4. В Control Center / Автоматизации / Задания добавлен выбор картинки:
   - «Выбрать» открывает существующий Project Asset Picker;
   - «Авто» возвращает автоматический art;
   - в списке заданий показывается фактический art и режим «свой / авто».

5. В Control Center добавлена вкладка «Цепочки»:
   - показывает все task_series;
   - позволяет назначить отдельный art цепочки;
   - позволяет вернуть авто-art.

6. API /api/tasks/state отдаёт готовые поля artUrl + artMode.
   Клиент не вычисляет критическое состояние и не делает дополнительных API-запросов ради картинок.

7. Картинки загружаются lazy + async decoding. При повреждённом пути используется безопасный icon_quest_game.

База данных
===========
Добавлена migration:
  migrations/0107_game_task_art.sql

Она добавляет:
  automation_chains.task_art_url
  task_series.art_url

Пустое значение означает «Авто». Старые задания автоматически совместимы.

Также обновлён integration snapshot scripts/fixtures/d1_pre_0087_snapshot.sql,
чтобы D1 replay видел реальную pre-0087 таблицу task_series перед ALTER TABLE 0107.

Изменённые файлы
================
index.html
owner.html
src/worker.js
assets/game-tasks.css
assets/game-tasks.js
migrations/0107_game_task_art.sql
scripts/migration-history.lock.json
scripts/fixtures/d1_pre_0087_snapshot.sql
PATCH_README_RU.txt

Установка
=========
Из корня проекта после скачивания ZIP в Downloads:

unzip -o "$HOME/Downloads/sweet-run-task-art-stage6-20260930.zip" -d .

Применить D1 migration:

npx --yes wrangler@4.131.1 d1 migrations apply zefirok-rewards --remote

Затем:

git status
git diff --check
git add -A
git commit -m "Add artwork to game tasks"
git push origin main
./update.sh

Проверки перед упаковкой
========================
PASS: node --check src/worker.js
PASS: node --check assets/game-tasks.js
PASS: strict Worker module syntax
PASS: index srcdoc integrity
PASS: migration history (106 migrations / 106 checksums)
PASS: schema contract static
PASS: operation system (424 checks)
PASS: P1 read paths
PASS: production asset references
PASS: SQLite replay pre-0087 snapshot -> migrations 0087..0107

Полный локальный Wrangler D1 integration в рабочем окружении ChatGPT упёрся в timeout.
D1 migration отдельно проверена последовательным SQLite replay до 0107 включительно.
Некоторые deploy/P2 checks требуют отсутствующий в переданной рабочей копии .assetsignore.
