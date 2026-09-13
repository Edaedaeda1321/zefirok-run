# SweetRun Urgent Album + Rating Recovery v1

## Что исправлено

### Альбом сезона 2
- Убрана ложная блокировка публикации вида «обязательный предмет ещё скрыт».
- Альбом теперь проверяет глобальный Live Content release-state предмета, а не только маршрут `manual`.
- Если предмет опубликован в проекте через Season Pass / case / shop / другой разрешённый маршрут, он больше не считается скрытым только потому, что `manual` route выключен.

### Рейтинг — защита от потери таблицы после обслуживания D1
- `leaderboard_entries` теперь самовосстанавливается из server-authoritative `player_economy_run_ledger` + `leaderboard_runs`.
- Безопасная автопроверка идёт:
  - при открытии рейтинга игроком;
  - при открытии раздела «Рейтинг» в Control Center;
  - каждые 5 минут через существующий cron;
  - перед финализацией рейтингового сезона.
- Автовосстановление само по себе возвращает только результаты, которые уже были помечены сервером как принятые в рейтинг. Оно не подмешивает произвольные забеги.
- Перед новым settlement рейтинг-сезон периодически принудительно reconcile-ится через существующий `ensureSeason`, чтобы stale status после D1 restore не оставлял новый забег вне активного сезона.

### Аварийное полное восстановление
В Control Center → Рейтинг → «Топ активного сезона» появилась кнопка **«Восстановить рейтинг»**.

После отдельного подтверждения она:
- включает Rating feature flag для всех игроков;
- снимает `maintenance.rating_disabled`;
- берёт все подходящие server-authoritative забеги текущего сезона;
- пересчитывает лучший результат каждого игрока;
- возвращает пропавших игроков и места в `leaderboard_entries`;
- синхронизирует `leaderboard_all_time`;
- исправляет `accepted_rating` / `leaderboard_runs.accepted` / `game_run_sessions.accepted_rating` для восстановленных забегов;
- возвращает отменённые dethrone-уведомления, которые во время сбоя были отменены именно по причинам `rating-entry-missing` / `rating-season-inactive`;
- если после восстановления сменился лидер, использует существующую систему уведомления о потере первого места.

Ничего не удаляется. Новых D1 migrations нет.

## Файлы
- `src/worker.js`
- `owner.html`

## После установки
1. Заменить файлы из архива.
2. Запустить обычный `./update.sh`.
3. Открыть Control Center → Рейтинг.
4. Посмотреть блок проверки целостности.
5. Один раз нажать **«Восстановить рейтинг»**, чтобы аварийно вернуть в текущий рейтинг также забеги, которые во время сбоя получили неверный status rejection.

## Проверки
- `node --check src/worker.js` — OK.
- inline JS `owner.html` — OK.
- schema contract — 221 tables / 203 indexes / 27 compatibility columns — OK.
- migration history — 88 files / 88 checksums — OK.
- operation system — 346 checks — OK.
- asset references — OK.
- Live Content assets / authority — OK.

`check-repo-hygiene` и `check-deploy-assets` не запускались в распакованном `Game.zip`, потому что этот архив не содержал локальные dotfiles `.gitignore` / `.assetsignore`. В реальном рабочем каталоге они есть и `./update.sh` проверит их штатно.
