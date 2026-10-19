# Сладкий Забег — первая оптимизация расхода D1 Rows Read (16.10.2026)

## Что установлено

Снимок Cloudflare: дневной лимит Workers Free **5 000 000 D1 Rows Read** превышен. Это лимит прочитанных *строк*, а не количества обращений к игре. Лимит относится ко всем базам аккаунта; без закрытой аналитики Cloudflare нельзя точно указать долю каждой SQL-команды.

В актуальном `main` репозитория при диагностике зафиксирован `src/worker.js` с blob SHA `75a0cdd727e543f027313c758be9c3800b2d8836`. Worker содержит два запроса к `reward_delivery_queue`, периодически выполняемых фоновым заданием `health-five-minutes`:

* `syncOperationalProblems`: суммарный статус и срок ожидания через `SUM(CASE ...)` + `MIN(CASE ...)` **без WHERE**, SQLite читает всю историю доставки.
* `buildAdminOverview`: суммарный статус `SUM(CASE ...)` **без WHERE**, повторно читает всю историю доставки.

Архивная политика хранит завершённые записи очереди 365 суток. Два полных прохода по истории каждые пять минут (288 запусков в сутки) дают около **5.18 млн просканированных строк/сутки уже при 9000 строках очереди**, без учёта других SQL-запросов. Это *расчёт потенциала*; точный вклад в инцидент подтвердят D1 Insights.

## Изменения

- `src/worker.js` — заменяет два сканирования всех статусов на селективные подзапросы `COUNT(*) WHERE status ...` и `MIN(created_at)` с использованием **существующих** индексов `(status,updated_at)` и `(status,created_at)`.
- `scripts/check-d1-read-hot-paths.mjs` — регрессионная проверка двух SQL, проверяет эквивалентность счётчиков на пустой и заполненной очереди (10 000 доставленных + активные/ошибочные записи), и убеждается по `EXPLAIN QUERY PLAN`, что вместо `SCAN` используется `SEARCH ... USING INDEX`.
- `scripts/check-production-gate.mjs` — включает этот тест в обязательный production gate.
- `scripts/d1-usage-insights.sh` — **только чтение аналитики Cloudflare** для двух баз. Сохраняет 4 JSON-файла вне репозитория, по суммарному Rows Read и количеству SQL-вызовов. Не выполняет SQL в D1 и не изменяет данные.

**Не изменяются** награды, инвентарь, логика очереди, статусы доставки, денежные операции, scheduled cadence, миграции D1, `wrangler.jsonc`, клиент и пути API.

## Проверки

- `node --check src/worker.js` — пройдено.
- `node --no-warnings --experimental-sqlite scripts/check-d1-read-hot-paths.mjs` — пройдено. Оба исходных SQL давали `SCAN reward_delivery_queue`; оба новых используют `SEARCH ... USING COVERING INDEX`.
- `npm run check:fast` — пройдено: **87 проверок** на полноценной копии актуального проекта; локальная интеграция с D1 в `--skip-d1` НЕ запускалась.

## Установка

1. Из корня репозитория при чистом рабочем дереве:

```bash
git status
git pull --ff-only origin main
unzip -o ~/Downloads/Sladkiy_Zabeg_D1_Reads_Hotfix_2026-10-16.zip -d .
node --no-warnings --experimental-sqlite scripts/check-d1-read-hot-paths.mjs
npm run check:fast
git diff --check
git add src/worker.js scripts/check-production-gate.mjs scripts/check-d1-read-hot-paths.mjs scripts/d1-usage-insights.sh
git commit -m "Reduce recurring D1 reward queue full scans"
git push origin main
./update.sh
```

2. **Без новой миграции**. Прежде чем повторять деплой, убедитесь, что обычные predeploy DB/schema проверки доступны: на Free D1 при исчерпании лимита удалённые запросы к базе могут временно возвращать ошибки.

3. Получить закрытую статистику, чтобы выяснить все источники нагрузки (отдельно по двум базам):

```bash
bash scripts/d1-usage-insights.sh
```

Команда создаст папку в `~/Downloads` с четырьмя JSON-файлами. Пришлите их для точного ранжирования запросов `totalRowsRead`, `avgRowsRead`, `numberOfTimesRun`. Если командой `d1 insights` не поддерживается данный набор опций в вашей версии Wrangler, используйте `npx --yes wrangler@4.131.1 d1 insights --help` или Cloudflare Dashboard → D1 → база → Metrics.

## Другие подтверждённые потенциально дорогие пути, пока НЕ исправленные

- Часовое восстановление рейтинга: `leaderboardServerRunRegistry` фильтрует `game_run_sessions` и `game_run_live_proofs` выражениями `COALESCE(NULLIF(...), ...)`, что может препятствовать использованию обычных индексов времени. Переписывать без проверки планов и совместимости старых данных нельзя.
- Полная коллекция: `playerCollectionRaritySnapshot` выполняет пять проходов `json_each` по `case_player_state` с вычислением долей владельцев предметов. В этом вызове применяется память изолята на 10 минут, но это не глобальный кеш между изолятами.
- Уведомления об окончании сезона: в последние 3 дня фоновое создание получателей по `admin_profile_state JOIN bot_subscribers` может повторно обходить пользователей каждую минуту.

После D1 Insights именно эти операции стоит проверить следующими. Увеличение тарифа может восстановить доступ к базе, но само по себе не устраняет неэффективные SQL-запросы.
