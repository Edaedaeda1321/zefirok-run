# Сладкий Забег — устранение recurring D1 Rows Read по реальным Insights

Дата анализа: 16.10.2026. Основа: актуальный GitHub `main` (до этого патча Worker blob `bf66586c78cdb8ad43937ac49f460f32f73b0684`).

## Источник диагностики

Пользовательские JSON-отчёты `d1 insights` (период `1d`, сортировка `reads` и `count`) для баз `zefirok-rewards` и `zefirok-candidate-v4-daily`.

В `zefirok-rewards` 25 наиболее дорогих запросов прочитали 4 928 911 строк. Это **не полный объём** чтений: отчёт ограничен первыми 25 SQL-запросами. Вторая база вернула `[]` — в пределах этих отчётов записей нет.

| SQL-группа | Rows Read | Выполнений | Причина |
| --- | ---: | ---: | --- |
| daily loyalty schema probe | 1 303 416 | 343 | четыре повторных обхода `sqlite_master` |
| season pass quick schema check | 659 686 | 673 | проверка 24 таблиц выполнялась даже при готовом marker |
| legacy reward queue operation_id backfill | 373 716 | 1 483 | UPDATE всей истории на каждом новом Worker isolate |
| player_notification_queue season cancellation | 369 076 | 1 122 | проверка отмены раз в минуту |
| active leaderboard players DISTINCT | 324 870 | 255 | 5-минутная статистика (пока не меняем) |
| leaderboard winner notification recovery | 300 440 | 580 | восстановительная проверка (пока не меняем) |
| season reminder deliveries cancellation | 240 994 | 806 | повторная проверка отмены раз в минуту |

## Что меняется

1. `ensureDailyLoyaltySchema`: имена 4 обязательных дополнительных таблиц проверяются при компиляции SQL через нулевой подзапрос (`NOT EXISTS (SELECT 1 ... LIMIT 0)`). SQLite не читает `sqlite_master` 4 раза. При отсутствующей таблице исходный compatibility fallback остаётся доступным.
2. `ensureSeasonPassSchema`: если сохранён marker готовности схемы, повторный запрос по `sqlite_master` и множество `PRAGMA table_info` пропускаются. При отсутствии marker выполняется прежний quick-check и маркер записывается только после успеха. Контракт схемы и миграции остаются авторитетными.
3. `ensureSafeControlCenterSchema`: заполнение пустого `operation_id` теперь выполняется однократно на D1 благодаря новому служебному ключу `bot_system_state` (`reward-queue:operation-id-backfill:v1`). Старый SQL и AFTER INSERT trigger сохранены. Повторный запуск без новых записей не сканирует всю историю.
4. `processCriticalServerQueues`: сезонные напоминания, у которых окна 3 суток и 24 часа, проверяются каждые 5 минут вместо каждой минуты. Остальные critical-queues, выдача наград и уведомления продолжают работать с прежней периодичностью.
5. Добавлен SQLite-регрессионный тест `scripts/check-d1-insights-read-hotspots.mjs` в production gate.

**Дополнительно**: патч уже включает два query-fix из предыдущего D1 hotfix для очереди наград. Версия до данного ZIP использует исправленный Worker `bf665...`, поэтому остальные механики не затрагиваются.

## Что НЕ меняется

- Схема D1, старые записи, суммы валют и начисление наград.
- Логика завершения сезонов и типы уведомлений.
- Серверные операции, кейсы, балансы, пропуск, Мир Зеффи, тариф Cloudflare.
- Важные и срочные cron-задачи продолжают работать раз в минуту.

Точный экономический эффект будет виден только после production-деплоя по новой выборке Insights: текущий отчёт до изменений не является A/B-замером. Потенциал экономии — порядка 2–3 млн повторных чтений за сопоставимые сутки, но фактический результат зависит от нагрузки, кэшей Worker и числа записей.

## Состав ZIP

- `src/worker.js` — точечные изменения.
- `scripts/check-production-gate.mjs` — дополнительный пункт в production gate.
- `scripts/check-d1-insights-read-hotspots.mjs` — регрессионная проверка на встроенном SQLite Node.
- `README_D1_INSIGHTS_RU.md` — этот файл; `.assetsignore` проекта уже исключает `README*` из публикации.

## Установка

Работать из корня git-репозитория. Убедиться, что ветка `main` актуальна, а рабочие файлы не содержат незакоммиченных независимых правок.

```bash
git status
git pull --ff-only origin main
unzip -o ~/Downloads/Sladkiy_Zabeg_D1_Insights_Recurring_Reads_Fix_2026-10-16.zip -d .
node --no-warnings --experimental-sqlite scripts/check-d1-insights-read-hotspots.mjs
npm run check:fast
git diff --check
git add src/worker.js scripts/check-production-gate.mjs scripts/check-d1-insights-read-hotspots.mjs
git commit -m "Reduce recurring D1 schema and maintenance scans"
git push origin main
./update.sh
```

**Миграции не нужны.** Если D1 ещё заблокирована ошибкой 7500, дождаться восстановления лимита и лишь тогда выполнить `./update.sh`. Не заменять его прямым `wrangler deploy` и не обходить predeploy schema gate.

## Проверки

- Новый SQLite-тест: 6 сценариев PASS, включая проверку отсутствующей таблицы и сохранения idempotency trigger.
- Предыдущий `check-d1-read-hot-paths.mjs`: PASS.
- `npm run check:fast`: 88 проверки PASS.
- Полный `scripts/check-d1-integration.mjs` через Wrangler в текущей ограниченной среде не завершился: инструмент требует `npx wrangler`, а сеть недоступна. Живая D1 не проверялась. В проекте перед деплоем выполняется полноценная remote schema gate.

## После деплоя

1. Запустить `bash scripts/d1-usage-insights.sh` повторно через 1–3 часа и на следующий день.
2. Проверить, что те же шаблоны запросов больше не занимают верхние строки ТОП-25.
3. Проверить выдачу наград (обычную и из пропуска), дневной календарь, сезонные уведомления и статистику.
4. Следующим отдельным оптимизационным этапом разобрать более 50 тысяч `INSERT OR IGNORE`/`UPDATE` в Live Content и десятки тысяч повторных `CREATE TABLE IF NOT EXISTS` в runtime. Несмотря на то что большинство этих запросов имеют `totalRowsWritten=0`, они создают высокую частоту обращений к D1. В данном хотфиксе систему публикации Live Content не меняем.
