# Сладкий Забег — D1: снижение расходов на восстановление уведомлений победителей

Дата: 16.10.2026. Исходный файл `src/worker.js` взят из актуального `main` с Git blob SHA `2797669f23be457da8eb2e72ae3424ccdfe44b7a` (коммит `4c2b05df082dddbdead80a263844c36ab02fd6bd`).

## Почему нужен патч

При сравнении D1 Insights за 24 часа (архивы от 2026-10-15 23:32 UTC и 2026-10-16 00:03 UTC) SQL `SELECT s.id FROM leaderboard_seasons s ... JOIN leaderboard_rewards ... NOT EXISTS (player_notification_queue)` вырос с 300440 до 325304 прочитанных строк; число выполнений выросло с 580 до 628. Это +24864 строк и +48 вызовов за около 31 минуту. Запрос нужен только для редкого восстановления уведомления победителю, пропущенного из-за сбоя.

Изменения предыдущего D1 recurring-reads хотфикса были отправлены в GitHub около 00:00 UTC, то есть свежий Insights спустя три минуты всё ещё отражает старую большую часть скользящих 24 часов. Уменьшение суммарного ТОП-25 на 94323 строки **не является** доказательством снижения текущего суточного лимита. Два отчёта имеют перекрывающееся окно и топ по SQL, а не полный usage аккаунта.

## Что изменено

1. `src/worker.js`: исключительно резервная операция `recoverLeaderboardWinnerNotifications` в critical-queues выполняется в каждую десятую минуту UTC вместо каждой минуты. Семидневное окно восстановления, SQL, проверка подписчика и дедупликация остаются прежними.
2. `scripts/check-rating-finale-delivery.mjs`: защита ритма восстановления и немедленной выдачи уведомления добавлена к существующему SQLite-интеграционному тесту. Он также проверяет отсутствие дублей, статус выплаты и уведомления.

**Важно:** в момент завершения рейтинга `queueLeaderboardWinnerNotification` вызывается немедленно, как раньше. Награда игрока и сам процесс завершения сезона не задерживаются. Только аварийный catch-up уведомления может задержаться приблизительно на 10 минут.

Миграции, изменение D1 schema, валют, кейсов, CC и персональных данных не требуются. В случае недоступной D1 патч не отключает predeploy-гейты.

## Проверки

- `node --check src/worker.js` — успешно.
- `node --no-warnings --experimental-sqlite scripts/check-rating-finale-delivery.mjs` — PASS.
- `npm run check:fast` — 88 проверок PASS; удалённая интеграция D1 здесь не выполнялась.

## Установка

Из корня `zefirok-run`. Сначала проверить чистый рабочий каталог и актуальную ветку main:

```bash
git status
git pull --ff-only origin main
git hash-object src/worker.js
```

Если SHA файла **не** `2797669f23be457da8eb2e72ae3424ccdfe44b7a`, **не распаковывать поверх более нового Worker**: получить обновлённый патч для вашего `main`.

```bash
unzip -o ~/Downloads/Sladkiy_Zabeg_D1_Rating_Winner_Recovery_Patch_2026-10-16.zip -d .
node --no-warnings --experimental-sqlite scripts/check-rating-finale-delivery.mjs
npm run check:fast
git diff --check
git diff --stat

git add src/worker.js scripts/check-rating-finale-delivery.mjs
git commit -m "Throttle rating winner recovery D1 reads"
git push origin main
./update.sh
```

После реального production-деплоя соберите Insights за **1h**, если установленный Wrangler принимает этот период (проверить `npx wrangler d1 insights --help`), а затем снова за 1d спустя сутки. Основное мерило — число прочтений и вызовов конкретного SQL за сопоставимый период, а также отсутствие пропавших уведомлений победителям. Не использовать `wrangler deploy` отдельно вместо `./update.sh`.
