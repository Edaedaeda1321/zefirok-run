# Сладкий Забег — Rating Fast Read v1

## Причина

Публичный `/api/leaderboard/state` синхронно запускал `maybeRepairLeaderboardIntegrity(...)` при каждом открытии текущего сезона. После серии recovery-патчей этот repair стал полноценным forensic reconciliation: он проверяет authoritative run history, несколько D1 таблиц, может восстанавливать записи и уведомления. Это maintenance/write-path, а не обычное чтение рейтинга.

На клиенте `rating.html` одновременно запрашивал `season` и `all_time` сразу после открытия. В результате первый экран рейтинга конкурировал за D1 сразу с двумя полными read-path запросами, а сезонный запрос ещё и ждал recovery. Клиент прерывает запрос через 12 секунд и показывает «Сервер отвечает слишком долго».

## Исправление

- `/api/leaderboard/state` больше не запускает integrity recovery синхронно на публичном read-path.
- Самовосстановление рейтинга не удалено: оно остаётся в 5-минутном cron и в явных recovery-инструментах Control Center; settlement/retry path также сохраняет свои точечные repair-механизмы.
- `rating.html` при первом открытии загружает только активную вкладку `Текущий сезон`.
- `За всё время` загружается существующим lazy-handler только при переключении вкладки.
- Таймаут 12 секунд оставлен как диагностическая граница: после разгрузки read-path нормальное открытие не должно подходить к ней.
- Добавлен `scripts/check-rating-fast-read.mjs`, который не даёт вернуть тяжёлый repair в публичный state и проверяет синтаксис inline-JS рейтинга.

## D1

Новых таблиц, колонок, индексов и migrations нет.

## Проверка

```bash
node --check src/worker.js
node scripts/check-rating-fast-read.mjs
node scripts/check-p1-read-paths.mjs
git diff --check
```

После deploy достаточно обычного `./update.sh`. `wrangler d1 migrations apply` не нужен.
