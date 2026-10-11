# Мир Зеффи — исправление production gate v12 (уровни v8 + New City v10/v11)

## Причина аварии

После установки New City v10 `world/engine.js` был заменён версией без `CITY_LEVELS`, `reconcileCityProgress`, `claimCityLevelReward` и `progress` в сохранении города. Однако `src/zeffi-world-service.js` с валютными наградами v8 по-прежнему импортировал эти экспорты. Node прекращал загрузку серверного модуля, а `scripts/check-production-gate.mjs` останавливался на Zeffi World shared D1.

Заодно New City v10 перезаписал `world/app.js` и `world/ru.js`, поэтому прогресс в блоке «Город в цифрах» и обработчик кнопки «Забрать» перестали работать, несмотря на наличие HTML-разметки.

## Что исправлено

`patches/world-city-level-compat-v12.patch` безопасно объединяет **уже установленный New City v10** и систему уровней города v8. Затрагиваются только:
- `world/engine.js`: все пять уровней, сохранение `progress`, правила уюта, бонусы жителей от старых и новых парков (только первые два объекта одного типа), восстановление функций начисления и сохранения. Сохранены транспортные объекты, их цены, размеры, строительные стадии и бонусы.
- `world/app.js`: клиентский UI прогресса, валютные иконки, кнопка получения, серверная операция `claim-level` с нулевой котировкой, корректный комфорт при отрисовке NPC, защита локальной песочницы от повтора награды через Undo/Redo.
- `world/ru.js`: названия уровней и сообщения ошибок; тексты нового транспортного раздела сохранены.

Добавлены файлы:
- `world/tests/city-level-new-city-v12.test.mjs` — 5 регрессионных тестов, покрывают цены и объекты New City, стадии строительства, бонусы населения и разовые валютные награды.
- `scripts/check-world-city-level-v12.mjs` — отдельная проверка ESM-импортов движка и Worker, наличия UI и серверного `claim-level`.

**ВАЖНО:** этот патч ожидает, что в `src/zeffi-world-service.js` уже установлен серверный обработчик `claim-level` из v8 (это подтверждается вашим логом ошибки). Не возвращайте поверх него старый `src/zeffi-world-service.js` из GitHub. Если проверка v12 сообщает об отсутствии `claim-level`, остановитесь и сообщите об этом до публикации. Здесь серверный модуль специально не перезаписывается.

Никаких новых изображений, таблиц D1, миграций или изменений игровых валютных цен. После применения уже созданные города и кошельки остаются как были, уровни определяются по завершённым постройкам и фиксируются при серверной операции. Награды выдаются атомарной D1-транзакцией, в которой отметка `claimedLevels` и обновление кошелька подтверждаются вместе.

## Установка — в корне `zefirok-run`

Убедитесь, что ваши незакоммиченные изменения сохранены (или хотя бы зафиксированы в отдельной ветке). Не переключайте ветку и не делайте `git pull`, если `git status` показывает неизвестные изменения.

```bash
# Из папки корня zefirok-run

git status
git switch main
git pull --ff-only origin main

unzip -o "$HOME/Downloads/Mir_Zeffi_City_Levels_Prod_Gate_Compat_v12.zip" -d .

git apply --check patches/world-city-level-compat-v12.patch
git apply patches/world-city-level-compat-v12.patch

node --check world/engine.js
node --check world/app.js
node --check world/ru.js
node --check src/zeffi-world-service.js
node scripts/check-world-city-level-v12.mjs
node --test world/tests/*.test.mjs
node --no-warnings --experimental-sqlite scripts/check-zeffi-world-integration.mjs
node scripts/check-world-new-city-pack.mjs
node scripts/check-world-api-wiring.mjs
node scripts/check-production-gate.mjs

git diff --check

# Убедитесь, что ранее установленный обработчик claim-level из v8
# учтён в будущей публикации (в вашем логе он уже есть локально).
git status --short
git diff -- src/zeffi-world-service.js scripts/check-zeffi-world-integration.mjs

# Аудитный .patch оставлять в проекте не обязательно.
rm -f patches/world-city-level-compat-v12.patch

git add world/engine.js world/app.js world/ru.js \
  src/zeffi-world-service.js scripts/check-zeffi-world-integration.mjs \
  world/tests/city-level-new-city-v12.test.mjs \
  scripts/check-world-city-level-v12.mjs \
  README_MIR_ZEFFI_CITY_LEVELS_COMPAT_V12_RU.md

git diff --cached --check
git commit -m "fix(world): restore city levels after New City integration"
git push origin main
./update.sh
```

**При любой ошибке `git apply --check`, регрессионного теста, D1-проверок или production gate ОСТАНОВИТЕСЬ, не выполняйте git push и ./update.sh.** Если Git пишет `patch does not apply`, у вас другая версия файлов или правка уже внесена: пришлите `git status` и сообщение `git apply --check`, не используйте `git apply --reject` и `unzip -o` старого v8-патча.

## Что проверено здесь

На локальной реконструкции New City v10 + v11 sprite metadata + v8 Worker/D1:
- 87/87 Node-тестов мира (включая 5 новых тестов v12).
- 22/22 SQLite/D1-транзакционных проверок, в том числе повторная выдача, подмена суммы и CAS-конфликты.
- `check-world-new-city-pack.mjs`: 7 новых построек, 112/112 WebP, 4 ракурса, три стадии строительства, PASS.
- `check-world-city-level-v12.mjs`: ESM-импорты Worker/движка, серверная награда и UI, PASS.
- `git apply --check` и `git apply` применены к чистым файлам New City v10, полученные файлы побайтно совпадают с проверенной сборкой.

**Полный production gate в локальной копии здесь не запускался**, так как нет всех внутренних production-файлов и фактического локального дерева пользователя. Его обязательно выполнить в вашем полном проекте и затем проверить получение награды тестером в Telegram.
