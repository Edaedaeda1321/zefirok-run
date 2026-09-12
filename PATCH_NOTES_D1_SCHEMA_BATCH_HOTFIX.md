# D1 schema predeploy batch hotfix

## Причина
`./update.sh` доходил до `scripts/predeploy-schema-gate.mjs`, где `checkRemoteDatabaseSchema()` запрашивал колонки 20 обязательных таблиц одним SQL с 20 ветками `UNION ALL` по `pragma_table_info(...)`.

Cloudflare D1 отклонял этот запрос с:

`too many terms in compound SELECT: SQLITE_ERROR [code: 7500]`

Это не schema drift и не pending migration. Production gate и локальная D1 integration до этого шага проходят.

## Исправление
`scripts/check-database-schema.mjs` теперь разбивает список таблиц на batch по 5 таблиц:

- те же `REQUIRED_COLUMN_SPECS`;
- те же `pragma_table_info` поля;
- те же строки объединяются в `columnRows`;
- `validateRemoteSnapshot()` не изменён;
- проверка indexes/triggers/contract/`PRAGMA quick_check` не ослаблена.

Для текущих 20 таблиц remote schema check делает 4 небольших column-запроса вместо одного compound SELECT из 20 частей.

## Миграции
Новых D1 migrations нет. Повторно применять `0088` не нужно.

## После установки

```bash
node scripts/check-database-schema.mjs --remote
./update.sh
```

Первый вызов должен закончиться строкой вида:

`Production D1 schema contract ... OK; PRAGMA quick_check=ok.`

После этого `./update.sh` должен пройти predeploy stamp, db-doctor и дойти до `wrangler deploy`.
