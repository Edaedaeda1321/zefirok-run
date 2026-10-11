# Проверки Story World v1

Источник: свежий main `b1a92576eb90b94dae6e5d2bf33482c09e443c2a`, проверенный через GitHub в начале задачи. Существующие модули восстановлены из предоставленных файлов и предыдущего патча; релевантные Git blob SHA сверены с main. Версия Node среды — 22.16.0, браузер — Chromium 144.0.7559.96.

## Выполнено

- `node scripts/check-world-story-v1.mjs`: 28 проверок успешно — отдельная страница, единственный вход, подписанная серверная авторизация, отсутствие localhost/URL bypass в hosted-loader, read-only endpoint до обращения к D1, отдельное локальное состояние, lifecycle, файлы ассетов и синтаксис.
- `node --test world/tests/story-world-v1.test.mjs world/tests/story-access-v1.test.mjs`: 42/42 успешно. В том числе 12 вариантов карты (3 сюжетных сценария × 4 состояния проекта), отсутствие пересечений/оторванных дорог, лимит последнего взноса, сохранение/восстановление таймеров, закрытые районы, отказ неавторизованным и не включённым в allowlist запросам. Серверные unit-тесты используют явно заданную фикстуру авторизации; это не проверка реальной Telegram-сессии.
- `node --test world/tests/*.test.mjs`: 205 всего, 194 успешно, 11 ошибок. До патча: 163 всего, 152 успешно, те же 11 ошибок. Новых падающих тестов нет; старые тесты не удалялись и не отключались.
- `node --no-warnings --experimental-sqlite scripts/check-zeffi-world-integration.mjs`: 21/21 успешно на локальной SQLite-модели D1: экономика, идемпотентность, текущий каталог, покупки и ускорения.
- `node scripts/check-production-gate.mjs --skip-d1`: release wiring и 60 шагов успешно. Здесь `--skip-d1` исключает последний комплексный прогон Wrangler; отдельные 21 тест D1 мира внутри gate всё равно выполнены. В production-командах этот флаг НЕ используется.
- Полный финальный Wrangler D1-прогон пытались запустить отдельно. Нужный `wrangler@4.131.1` отсутствует в кэше среды; внешняя установка недоступна, получен `ENOTCACHED`. Полный production gate без пропусков НЕ объявляется прошедшим.
- Реальный общий сервер, production-база и production-деплой не запускались и не изменялись.

## Браузер

Проверен собранный автономный HTML с реальным кодом, ассетами и Canvas-рендерером через Playwright `set_content`. Политика браузера в рабочей среде блокирует навигацию к URL, включая file:// и localhost; поэтому непосредственный двойной клик по file:// и hosted-вход с реальной Telegram-сессией в этой среде не проверены. Для рендера код не переписывался. В тесте сохранения использован отдельный in-memory Web Storage стенд; режим недоступного хранилища также проверен.

Проверены: 37 декодированных игровых WebP, ноль сетевых запросов в автономном HTML, ноль JavaScript-ошибок, мобильные/планшетные/десктопные размеры 320/390/768/1280 px без горизонтального переполнения, модальные карточки, размеры взносов, ограничение последнего взноса, помощь тестового сообщества, появление сюжетных зданий, стройка 45 секунд (в тесте с ускорением браузерных часов), открытие сада, сброс только собственного ключа, панорамирование/клавиатурный зум и пауза анимации. При паузе requestAnimationFrame не остаётся запланированным. Снимки экрана сняты с этой сборки, не являются дизайн-макетами.

Нативные жесты двух пальцев на реальном телефоне и производительность внутри Telegram iOS/Android ещё требуют проверки на устройстве. Наличие обработчиков жестов не выдаётся за такой тест.

## Известные исходные ошибки полного world/tests

1. `3D raised plazas no longer let houses, decor or roads float on their pillars`
2. `children playground footprint is truly 2x2 in all directions and both manifests`
3. `flower square contacts 3x3 ground instead of appearing airborne`
4. `server catalog permits adjacent 2x2 playgrounds and existing saves remain valid`
5. `v17: previously earned level remains unlocked after loss of buildings`
6. `v17: existing expensive purchases can be moved and stored even if current unlock level is insufficient`
7. `8 new landscape objects are purchasable single-cell decor; old 0.1.7 objects remain retired`
8. `v13: old buildings and premium decor are grounded without rescaling or moving saved objects`
9. `starter HOMES and small shops take about 3-4 ordinary runs from empty wallet`
10. `large buildings and parks cost meaningfully more than smaller ones`
11. `all 41 catalog prices are positive, safe integers and still server-quoteable`

Эти ошибки связаны с уже существующими ожиданиями размеров, контакта с землёй, цен, уровней и количества объектов. Этот патч не пытается их исправить или признать неважными. Перед публикацией требуется успешный полный прогон и разбор оставшихся ошибок.## Самоустановочный архив и контроль изменений

Самоустановщик проверен на распакованном ZIP: --check ничего не записывает; установка создаёт ровно ожидаемые исходники; повторная установка идемпотентна; резервная копия содержит пять оригинальных изменяемых файлов и квитанцию на 18 операций; установленная копия проходит 28 проверок wiring и 42 unit-теста. Отдельно проверены сохранение посторонних правок в world.html/сервисе/личном app, отказ до записи при несовместимом движке, повреждённом payload, конфликтующем новом файле, частичной вставке и симлинке. Искусственный сбой третьей записи полностью откатывает уже выполненные записи.

`git diff --cached --check` выполнен в локальном проверочном Git-дереве со всеми новыми файлами, установщиком и payload: ошибок нет. Это не commit/push в пользовательский репозиторий. Сравнение с исходной сборкой подтверждает отсутствие изменений в личном app/engine/renderer, каталоге, жителях, автобусах, Worker, wrangler.jsonc, update.sh и assets/images-manifest.json.