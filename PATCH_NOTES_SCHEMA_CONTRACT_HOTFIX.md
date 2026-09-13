# Sweet Run — Season 2 schema-contract hotfix

Причина блокировки deploy: Worker v6 создаёт runtime-index `idx_season_pass_case_grants_request`, но для него не было отдельной D1 migration. Production schema gate специально запрещает runtime schema drift.

## Что добавлено

- `migrations/0089_season_pass_case_request_recovery.sql`
  - добавляет `season_pass_case_grants.open_request_id`;
  - создаёт `idx_season_pass_case_grants_request`.
- `scripts/schema-contract.mjs`
  - фиксирует `open_request_id` как обязательную колонку;
  - фиксирует новый index как обязательный.
- `scripts/migration-history.lock.json`
  - зарегистрирована migration 0089 без изменения старой истории.

## Проверено

- `node scripts/check-database-schema.mjs --contract-only` — OK.
- `node scripts/check-migrations.mjs` — OK, 88 migrations / 88 checksums.

## Порядок применения

```bash
git add migrations/0089_season_pass_case_request_recovery.sql scripts/schema-contract.mjs scripts/migration-history.lock.json
git commit -m "Add seasonal case request migration"
git push origin main

npx --yes wrangler@4.131.1 d1 migrations apply zefirok-rewards --remote
./update.sh
```

Важно: migration нужно применить ДО `./update.sh`, потому что predeploy gate намеренно блокирует deploy при pending D1 migrations.
