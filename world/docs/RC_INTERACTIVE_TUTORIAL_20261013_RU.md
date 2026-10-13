# Мир Зеффи — интерактивное обучение закрытого RC

Дата: 13 октября 2026 года. Исходник: пользовательский архив `Архив(20261013-104555).zip`, с учётом ранее подготовленных закрытого RC, каталога и рейтинга. Патч содержит **только новые/изменённые файлы**, не полную игру.

## Что появилось

1. В личном городе: 6 шагов Зеффи (введение -> «Строить» -> категория «Жильё» -> карточка объекта -> необязательное размещение макета без оплаты -> «Город в цифрах»).
2. В общем городе: 6 шагов (введение -> Центральная площадь -> закрыть карточку -> «Стройки» -> «Сад встреч» -> необязательное знакомство с взносами).
3. Тёмная маска вокруг нужного игрового элемента, золотой контур и диалог Зеффи на основе существующего скина `assets/skins/shop/default.webp`. Нажатие в подсвеченную область — реальное нажатие в игровой интерфейс. Весь процесс можно пропустить, а позже повторить с кнопки помощи. На коротких дисплеях карточка переходит выше/ниже цели.
4. Server-authoritative состояние: API `/api/world/tutorial` с существующей Telegram-аутентификацией, `WORLD_ENABLED` и `WORLD_TESTER_IDS`, отдельные счётчики для личного и общего города в D1. Чтение личного прогресса включено в уже существующий `/api/world/state`, без дополнительного запроса на загрузке. Общий город делает одно чтение после входа, затем шаги отправляются после пользовательских действий. Прогресс каждого режима не может откатиться назад из устаревшего клиента.
5. Реальные покупки, платежи, награды, управление балансом, прогресс общего фонда и карты D1 не менялись. Урок не инициирует и не подтверждает платёж. Список тестеров не расширяется.

## Миграция — ОБЯЗАТЕЛЬНО до нового Worker

`migrations/0117_zeffi_world_tutorial.sql` создаёт только `zeffi_world_tutorial` (telegram_id, personal_step, story_step, updated_at). Существующие кошельки, города, игроки и миграции не изменяются. Файл добавлен в `scripts/migration-history.lock.json`.

Перед применением к production запустить `wrangler d1 migrations list zefirok-rewards --remote`, проверить, что в очереди только ожидаемые миграции, затем `wrangler d1 migrations apply zefirok-rewards --remote`. Не публиковать новый Worker, если миграция не применена.

## Состав

```
migrations/0117_zeffi_world_tutorial.sql
scripts/build-world-story-v1.py
scripts/check-production-gate.mjs
scripts/check-world-api-wiring.mjs
scripts/check-world-catalog-rc-ui.mjs
scripts/check-world-dual-v1.mjs
scripts/check-world-rc-gate.mjs
scripts/check-world-story-v1.mjs
scripts/migration-history.lock.json
src/zeffi-world-service.js
src/zeffi-world-tutorial.js
story-world.html
world.html
world/app.js
world/story/app.js
world/story/boot.js
world/tests/festival-hall-stages-v1.test.mjs
world/tests/world-tutorial-rc.test.mjs
world/tutorial.css
world/tutorial.js
```

## Проверки, выполненные в рабочей копии

* `node --test world/tests/*.test.mjs` — 299 тестов, без ошибок.
* `node scripts/check-production-gate.mjs --skip-d1` — 71 проверка, успешно, D1-интеграция **не** запускалась.
* `node scripts/check-migrations.mjs --local-only` — 116 миграций и контрольных сумм.
* `python3 scripts/build-world-story-v1.py --output /tmp/zeffi_story_preview_check.html` — офлайн-сборка успешна.
* Headless Playwright: оба шестишаговых сценария на интерактивном **демонстрационном** HTML-предпросмотре, проверка размещения окна на размерах 360×740, 390×844, 414×896 и 560×1150.

Ограничения: не проверяли реальный Telegram WebView, удалённую D1 и запуск всего игрового интерфейса в браузере (ограничения локального браузерного окружения). Перед расширением доступа нужно провести smoke-тест с реальными тестерами на iOS и Android.

## Дополнительное

В ZIP **не** включён иллюстративный HTML-предпросмотр. Он поставляется отдельной ссылкой, не относится к production-ассетам и не должен публиковаться на сервер игры.

Старайтесь запускать `git add` только с указанными путями, не `git add -A`, так как в корне проекта существуют сторонние арт-паки и старые материалы.
