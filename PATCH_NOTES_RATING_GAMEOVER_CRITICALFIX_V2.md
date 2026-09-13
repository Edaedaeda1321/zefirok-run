# Сладкий Забег — Rating + Game Over Critical Fix v2

База патча: актуальные production-файлы `main` на момент исправления.

- исходный `index.html` Git blob: `b87b533e05fe3daa170b3f2d037141b93a14190f`
- исходный `src/worker.js` Git blob: `71bce749ac6ab29c20ce5ad792fc0e2dc9d94079`

## Первопричина исчезнувшего завершающего окна

В новом окне результатов забега функции `runResultsFrame`, `runResultsHeader` и `renderRunResultsSettled` использовали переменную `character`, но не создавали её в своей области видимости.

При столкновении `endGame()` вызывал `showRunResultsPending()` **до** `submitLeaderboardRun()`. Рендер результата падал с JavaScript `ReferenceError`, поэтому выполнение callback обрывалось одновременно в двух местах:

1. завершающее окно не появлялось, и игрок видел только остановленный забег / кнопку «Заново»;
2. authoritative submit на `/api/leaderboard/submit` вообще не запускался, поэтому такой забег не попадал в серверный ledger, не начислялся в рейтинг и не проходил обычный server settlement.

## Исправление клиента

- Восстановлено получение `character` через `runCharacterProfile(skinId)` во всех трёх функциях результата.
- `showRunResultsPending()` теперь изолирован от authoritative submit: даже если в будущем сломается какой-либо декоративный элемент result UI, это больше не сможет отменить серверное сохранение забега.
- Рендер подтверждённого результата также изолирован `try/catch`; в аварийном случае игрок хотя бы получает fallback-окно, а сохранённый сервером результат остаётся сохранённым.
- Штатное красивое окно результатов, статистика, награды, рекорд и кнопки снова используются после столкновения.

## Исправление рейтинга

### Новые забеги

Публичный feature flag рейтинга больше не используется как условие записи корректного server-authoritative забега в активный рейтинг.

Feature flag остаётся UI/rollout-механизмом. Остановить сбор рейтинга может только явный maintenance `ratingDisabled`.

Это устраняет ситуацию, когда игрок реально играет, но его корректный забег помечается `rating_disabled` и не появляется в таблице только из-за rollout/config состояния.

### Восстановление текущего сезона

Автовосстановление рейтинга усилено:

- при открытии рейтинга;
- при открытии рейтинга в Control Center;
- cron-проверкой;
- перед финализацией активного сезона.

Для primary-рейтинга восстановление ориентируется на временное окно активного сезона и authoritative историю забегов. Это позволяет вернуть игроков, если после обслуживания/восстановления D1 у части ledger-строк остался старый или пустой `season_id`.

Восстанавливаются:

- `leaderboard_entries`;
- лучший результат `leaderboard_all_time` без понижения старого рекорда;
- `accepted_rating` и корректный `season_id` для recoverable забегов;
- `leaderboard_runs.accepted` для забегов, потерянных из-за `rating_disabled` / временного состояния сезона;
- `game_run_sessions.accepted_rating`;
- отменённые уведомления рейтинга с причинами `rating-entry-missing` / `rating-season-inactive`;
- уведомление о потере лидерства, если после восстановления лидер реально изменился.

Повторная отправка уже существующего idempotent run теперь также пытается восстановить его в активном рейтинге, если он соответствует минимальным требованиям и раньше был отклонён только временным состоянием рейтинга.

## Важное ограничение восстановления

Забеги, которые завершились во время клиентского `ReferenceError` и **никогда не дошли до `/api/leaderboard/submit`**, нельзя безопасно дорисовать задним числом: сервер не получил финальное событие столкновения/результат. Мы не выдаём очки по незавершённым сессиям, чтобы не засчитать брошенные или оборванные забеги.

Все забеги, которые успели попасть в authoritative ledger / leaderboard history, восстанавливаются автоматически.

## Файлы

- `index.html`
- `src/worker.js`

Новых D1 migration нет.

## Проверки

- `node --check src/worker.js` — OK
- все executable `<script>` внутри встроенной игры `index.html` — `node --check` OK
- outer iframe / `data-srcdoc` после патча корректно парсится, title сохранён
- `node scripts/check-database-schema.mjs --contract-only` — OK: 221 runtime tables, 203 indexes, 27 compatibility columns
- `node scripts/check-operation-system.mjs` — OK: 346 checks
- `node scripts/check-assets.mjs` — OK: 313 files
- `node scripts/check-live-content-assets.mjs` — OK: 116 files
- `node scripts/check-asset-manifest.mjs` — OK

`check-d1-integration.mjs` в локальной архивной копии не уложился в локальный test timeout; production D1 не изменялся и новых миграций нет.

## Установка

Заменить `index.html` и `src/worker.js`, затем обычный production workflow:

```bash
git add index.html src/worker.js PATCH_NOTES_RATING_GAMEOVER_CRITICALFIX_V2.md
git commit -m "Fix run results and restore rating ingestion"
git push origin main
./update.sh
```

Отдельно `wrangler d1 migrations apply` для этого патча не нужен.
