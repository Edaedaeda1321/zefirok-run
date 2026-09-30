СЛАДКИЙ ЗАБЕГ — 16 АРТОВ ЗАДАНИЙ
Дата: 2026-10-01

Что сделано
-----------
1. 16 исходных PNG из Art_Task_all.zip конвертированы в production WebP.
2. Размер каждого арта: 1280x720, WebP quality 84, metadata stripped.
3. Арты подключены к автоматическому server-side выбору картинок Task Hub.
4. Ручной арт из Owner имеет приоритет и НЕ перезаписывается автоматикой.
5. Событийные задания без ручного арта получают task_event.webp.
6. Цепочки без ручного арта получают task_series.webp.
7. Завершенная цепочка без ручного арта получает task_series_final.webp.
8. Новые широкие арты /assets/tasks/ показываются full-bleed 16:9.
   Старые/ручные арты сохраняют прежний contain-режим, чтобы не ломать существующие изображения.
9. Обновлен assets/images-manifest.json, поэтому новые арты сразу доступны Asset Picker в Owner.

Автоматическое соответствие
---------------------------
accepted_runs -> task_runs.webp
total_score -> task_score.webp
single_run_score -> task_single_run_score.webp
collect_zefir -> task_zefir.webp
collect_coffee -> task_coffee.webp
single_run_duration / play_time -> task_time.webp
best_score / new_records -> task_record.webp
opened_cases / case_purchases / open_specific_case -> task_cases.webp
runs_with_skin / skin_purchases -> task_skins.webp
runs_with_booster -> task_boosters.webp
runs_without_boosters -> task_no_boosters.webp
level_reached -> task_level.webp
new_player_delay / promo_activations / shop_purchases / physical_purchases -> task_special.webp
task_mode=event -> task_event.webp (если нет ручного арта)
series -> task_series.webp
completed series -> task_series_final.webp

Файлы патча
-----------
src/worker.js
index.html
assets/game-tasks.js
assets/game-tasks.css
assets/images-manifest.json
assets/tasks/task_runs.webp
assets/tasks/task_score.webp
assets/tasks/task_single_run_score.webp
assets/tasks/task_zefir.webp
assets/tasks/task_coffee.webp
assets/tasks/task_time.webp
assets/tasks/task_record.webp
assets/tasks/task_cases.webp
assets/tasks/task_skins.webp
assets/tasks/task_boosters.webp
assets/tasks/task_no_boosters.webp
assets/tasks/task_level.webp
assets/tasks/task_special.webp
assets/tasks/task_event.webp
assets/tasks/task_series.webp
assets/tasks/task_series_final.webp

Migration
---------
Новая migration НЕ нужна. Используется уже существующая система task_art_url / task_series.art_url.

Установка
---------
Из корня проекта:
unzip -o "$HOME/Downloads/sweet-run-task-art-16-connected-20261001.zip" -d .

Проверка/деплой:
git status
git diff --check
git add -A
git commit -m "Add task category artwork"
git push origin main
./update.sh
