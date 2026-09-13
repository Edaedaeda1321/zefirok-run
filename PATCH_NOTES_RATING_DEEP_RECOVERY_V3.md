# Сладкий Забег — Rating Deep Recovery v3

База патча: актуальный `main` репозитория `Edaedaeda1321/zefirok-run` на момент задачи.

- base commit: `2d243524ca99fa4b7a01cc4c0fda29a4e8ca2ac5`
- задача: вернуть в активный рейтинг игроков, чьи забеги были реально сыграны во время поломки Game Over, но не попали в обычный рейтинг/ledger.

## Почему предыдущего восстановления оказалось недостаточно

Предыдущий repair восстанавливал рейтинг в основном из `player_economy_run_ledger` и `leaderboard_runs`.
Это правильно для обычных уже завершённых server settlement, но не покрывает старую поломку клиента, при которой Game Over падал до вызова `/api/leaderboard/submit`.

Для такого забега финальная ledger-запись могла вообще не появиться, хотя во время самого забега сервер уже получал защищённые контрольные точки.

## Какие server-authoritative источники теперь проверяются

Emergency recovery текущего рейтинга ищет лучший подтверждённый результат игрока сразу в четырёх источниках:

1. `player_economy_run_ledger` — штатный завершённый settlement.
2. `leaderboard_runs` — точная серверная история рейтингового submit, даже если ledger-строка была потеряна/не восстановилась.
3. `game_run_sessions` со статусом `finished` — точный завершённый server session.
4. `game_run_live_proofs` — последняя сервером подтверждённая контрольная точка забега, если старый клиент не дошёл до финального submit.

`game_run_live_proofs` не является произвольным клиентским localStorage: эти значения формируются через текущую server-side систему checkpoint attestation с проверкой времени, монотонности счёта и ограничений прогресса.

## Как восстанавливаются потерянные Game Over забеги

Для proof-only забега:

- используется **последний счёт, который сервер успел подтвердить до поломки клиента**;
- результат добавляется только в активный сезонный рейтинг;
- экономика, сладости, кофе, XP и прочие награды задним числом НЕ начисляются;
- proof-only результат НЕ повышает all-time рейтинг;
- если у игрока уже есть более высокий нормальный результат, он не понижается;
- восстановление не создаёт второй settlement и не пытается повторно списывать/начислять ресурсы.

Это позволяет вернуть реальных игроков в таблицу, не выдумывая отсутствующий финальный кадр столкновения и не создавая двойную выдачу экономики.

## Безопасность обычного режима

Live-proof recovery НЕ включён в обычный публичный auto-repair рейтинга.

Он запускается только через явную аварийную операцию:

`Control Center -> Рейтинг -> Восстановить рейтинг`

Обычная самопроверка продолжает использовать только точные authoritative источники.

## Что делает кнопка восстановления после патча

Кнопка теперь:

- включает рейтинг для всех игроков и снимает `maintenance.rating_disabled`;
- сканирует все четыре источника текущего сезона;
- возвращает отсутствующих игроков в `leaderboard_entries`;
- сохраняет лучший доступный серверно подтверждённый счёт каждого игрока;
- чинит `leaderboard_runs` / `game_run_sessions` для точных завершённых fallback-забегов;
- не помечает proof-only забег как полноценный экономический settlement;
- возвращает в ответ количество игроков, найденных именно через server proof.

## Изменённые файлы

- `src/worker.js`
- `owner.html`

Новых D1 migrations нет.

## Проверки

Пройдены на патче:

- `node --check src/worker.js` — OK;
- executable JavaScript в `owner.html` — OK;
- `node scripts/check-database-schema.mjs --contract-only` — OK, 221 runtime tables / 203 indexes / 27 compatibility columns;
- `node scripts/check-operation-system.mjs` — OK, 346 checks;
- `node scripts/check-migrations.mjs` — OK, 88 migrations / 88 checksums;
- `node scripts/check-assets.mjs` — OK, 313 files;
- `node scripts/check-live-content-assets.mjs` — OK, 116 files;
- `node scripts/check-asset-manifest.mjs` — OK;
- fallback SQL проверен на synthetic SQLite наборе: exact leaderboard run + finished session + superseded/stale live proof.

## Установка и фактическое восстановление Production

```bash
git add src/worker.js owner.html PATCH_NOTES_RATING_DEEP_RECOVERY_V3.md
git commit -m "Recover missing rating players from authoritative run proofs"
git push origin main
./update.sh
```

После deploy открыть:

`Control Center -> Рейтинг -> Восстановить рейтинг`

и подтвердить операцию один раз.

Именно в этот момент Worker выполнит поиск по Production D1 и вернёт найденных игроков в активный рейтинг.
