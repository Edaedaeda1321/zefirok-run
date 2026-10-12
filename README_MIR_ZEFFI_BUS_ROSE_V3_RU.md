# Мир Зеффи — интеграция утверждённого розового автобуса v3

Источник: последний пользовательский архив `Mir_Zeffi_Bus_Rose_4_Directions(3).zip` с четырьмя прозрачными PNG:
`bus_rose_se.png`, `bus_rose_sw.png`, `bus_rose_nw.png`, `bus_rose_ne.png`.

## Что изменено

- Существующие два визуальных автобуса (личный и общий город) используют **одну утверждённую розовую модель** в четырёх направлениях, без генерации/геометрических фигур/зеркалирования.
- Новый WebP-атлас `world/assets/transport-v3/bus-rose-atlas.webp` создан из четырёх исходных PNG. Старый атлас оставлен неизменённым для игроков с закешированным кодом v2. Формат — 2x2 кадра по 384x384, размер около 146 КБ, один HTTP-запрос вместо четырёх. Все кадры выровнены по общей привязке к дороге.
- `world/bus-art.js` выбирает кадр по фактическому вектору движения: x+→SE, y+→SW, x−→NW, y−→NE. Кадр используется также на остановке; при повороте выбирается ближайший из четырёх существующих ракурсов.
- Контроль исходных хэшей, atlas SHA-256, упаковки и направления движения добавлен в регрессионные тесты. Компилятор автономной сборки теперь использует новый атлас; проверка чистоты ассетов разрешает только один сохранённый для совместимости старый атлас.
- Старый установщик City Fix v2 **не должен откатывать** более новые ассеты: проверка v2.1 корректно трактует такой отказ как защиту от даунгрейда.

## Что НЕ менялось

`world/traffic.js`, `world/citizens.js`, `world/renderer.js`, `world/app.js`, `world/story/app.js`, `world/story/map.js`, `world/engine.js`, Worker, D1, экономика, API, маршруты, асфальт, пешеходные переходы, здания и сохранения игроков. Миграций нет.

## Совместимость

Разработано для свежего main `258f4ef494e2b266c02f6e59e9da3ab605df262e` (12 октября 2026), на котором уже установлены City Fix v2 + Deploy Checks v2.1.
Установщик перед записью сравнивает точные SHA-256 целевых файлов и связанные модули, делает бэкап, поддерживает повторный запуск. При несовпадении файлов прекращает работу. Нельзя обходить проверку ручной перезаписью.

## Установка из корня zefirok-run

```bash
git status --short
git switch main
git pull --ff-only origin main
unzip -o "$HOME/Downloads/Mir_Zeffi_Bus_Rose_v3_AutoInstall.zip" -d .
python3 scripts/apply-world-bus-rose-v3.py --check
python3 scripts/apply-world-bus-rose-v3.py
node scripts/check-world-bus-rose-v3.mjs
node scripts/check-world-city-fix-v2.mjs
node scripts/check-world-checks-v2-1.mjs
node scripts/check-world-story-v1.mjs
node --test world/tests/*.test.mjs
node --no-warnings --experimental-sqlite scripts/check-zeffi-world-integration.mjs
node scripts/check-production-gate.mjs
git diff --check
git status --short
```

## Git и production

Только если все проверки прошли, а `git status` не показывает посторонних файлов:

```bash
git add -A
git diff --cached --check
git diff --cached --stat
git commit -m "feat(world): integrate approved four-direction rose bus sprites"
git push origin main
./update.sh
git status --short
```

Production нельзя деплоить через прямой `npx wrangler deploy`: штатный путь проекта — `./update.sh`. Скрипт сам ничего не публикует.

## Предпросмотр

Отдельный файл `START_STORY_WORLD_Bus_Rose_v3.html` самодостаточен, работает локально без Telegram/Worker/D1 и использует реальный рендерер общего города. Его нужно распаковать в отдельную папку, НЕ в проект.

Важное ограничение: комплект содержит только 4 картинки, поэтому в момент смены направления на перекрёстке спрайт переключается скачком; плавных промежуточных ракурсов в исходном архиве нет. Изменение визуальное, не влияет на маршрут автобуса.
