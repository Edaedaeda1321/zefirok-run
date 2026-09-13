# P0 Schema Safety V1 — «Сладкий Забег»

Дата: 2026-09-13
База: актуальная сборка `Game(1).zip` из текущей беседы.

## Что исправляет этот патч

Патч закрывает P0-проблемы из полного аудита базы и runtime-схемы.

### 1. Schema Contract V2 — полный контроль runtime-схемы

До исправления release gate контролировал только небольшую часть объектов D1. Теперь статический и remote contract покрывает:

- 221 runtime-таблицу;
- 203 runtime-индекса;
- 115 обязательных trigger'ов;
- 110 account-revision trigger'ов;
- 27 legacy compatibility columns плюс критические contract columns.

Новый manifest: `src/runtime-schema-manifest.mjs`.

Если Worker начнёт использовать новую runtime-таблицу/индекс, а manifest/migration не обновлены, production gate падает до deploy.

### 2. Account Revision hooks больше не могут тихо пропасть

Migration 0087 содержит расширенные account revision hooks для Album, Achievements, Daily, Referrals, Mail, Polls, Season Pass и других систем. Теперь эти trigger'ы входят в обязательный schema contract и проверяются перед deploy.

### 3. Player API больше не ремонтирует сломанную schema «по дороге»

Добавлен read-only runtime circuit breaker в `src/worker.js`.

Для player API cold Worker один раз проверяет migration-backed contract. Если Production D1 неполная, запрос получает контролируемый `503 / SCHEMA_NOT_READY` до того, как старый `ensure*Schema()` успеет создать пустую таблицу и скрыть потерю данных.

Owner/Admin/Staff/Maintenance/health/legal bootstrap остаются доступны, чтобы база могла быть диагностирована и восстановлена.

### 4. DB Doctor V2 больше не даёт false-green

До исправления doctor мог пропустить проверку, если нужной таблицы вообще не было.

Теперь отсутствие обязательной:

- таблицы;
- колонки;
- индекса;
- trigger'а

фиксируется как schema problem. В gate-режиме critical schema problem блокирует продолжение.

Отчёт `.wrangler/db-doctor-last.json` получил schema coverage, missing objects и skipped checks.

### 5. D1 Integration больше не забывает последнюю migration

Раньше integration suite был жёстко привязан к 0087 + 0088 и не проверял 0089.

Теперь он автоматически применяет все migrations начиная с baseline snapshot `pre-0087`, то есть сейчас:

- 0087
- 0088
- 0089
- 0090

и автоматически захватит 0091+ в будущем.

Добавлен fixture `d1_schema_contract_cases.sql`, проверяющий:

- contract v2;
- 0089 recovery column/index;
- полный набор account revision hooks.

### 6. Migration 0090 намеренно НЕ создаёт отсутствующие player data tables

`0090_schema_contract_v2.sql` только переводит contract marker на v2.

Это сделано специально. Если Production потеряла Album/Referrals/Daily/etc., нельзя автоматически создать пустую таблицу и объявить базу здоровой. Remote gate остановит release, после чего нужен отдельный data-safe recovery по фактическому состоянию Production D1.

---

## Безопасный порядок применения

### Шаг 1 — до migration сделать read-only аудит текущей Production D1

```bash
node scripts/check-database-schema.mjs --remote --audit-current --quick-check
node scripts/db-doctor.mjs --remote --gate --no-samples
```

`--audit-current` проверяет полный набор объектов, но специально игнорирует новый marker v2, которого до 0090 ещё нет.

Если на этом шаге найдены missing table/index/trigger — НЕ применять repair вслепую и НЕ выкатывать Worker. Сначала восстановить конкретные объекты/данные отдельной recovery migration.

### Шаг 2 — если object audit зелёный, применить migrations

```bash
npx --yes wrangler@4.131.1 d1 migrations apply zefirok-rewards --remote
```

Это применит 0090 и все другие pending migrations.

### Шаг 3 — повторно проверить уже полный Contract V2

```bash
node scripts/check-database-schema.mjs --remote --quick-check
node scripts/db-doctor.mjs --remote --gate --no-samples
```

### Шаг 4 — deploy

```bash
./update.sh
```

`update.sh` дополнительно выполняет production gate + predeploy remote gate + DB Doctor перед `wrangler deploy`.

---

## Что проверено в этой среде

Успешно:

- `node --check src/worker.js`
- `node --check scripts/check-database-schema.mjs`
- `node --check scripts/check-d1-integration.mjs`
- `node --check scripts/schema-contract.mjs`
- `node --check src/runtime-schema-manifest.mjs`
- `node --check scripts/db-doctor.mjs`
- `node scripts/check-migrations.mjs`
- `node scripts/check-database-schema.mjs --contract-only`
- `npm run check:fast` — 11/11 checks, 346 operation-system checks
- SQLite functional integration: pre-0087 snapshot + 0087 + 0088 + 0089 + 0090 + recovery/idempotency/retention/schema-contract fixtures

В текущей sandbox-среде официальный Wrangler local D1 integration не был завершён, потому что `npx wrangler@4.131.1` требует недоступный/зависающий внешний npm path. SQL-chain и fixtures были отдельно прогнаны через SQLite и прошли.

## Важно

Production D1 этим патчем из чата не изменялась и deploy не выполнялся.

---

## V1.1 — Cloudflare D1 large-database quick_check fallback

На реальной Production D1 полный `PRAGMA quick_check` может быть отклонён Cloudflare с `SQLITE_NOMEM / code 7500` из-за лимита памяти самого D1 API. Это не является доказательством повреждения SQLite.

Начиная с V1.1:
- `SQLITE_NOMEM/code 7500` именно на whole-database `PRAGMA quick_check` считается инфраструктурным ограничением Cloudflare, а не schema failure;
- полный remote schema/object/column/trigger audit продолжает выполняться;
- неизвестные ошибки `quick_check` по-прежнему останавливают gate;
- DB Doctor остаётся обязательным data-integrity gate.
