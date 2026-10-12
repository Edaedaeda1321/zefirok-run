# Мир Зеффи: City Fix v2 / общий город v1.3

Исходная версия: проверенный GitHub main `3679387d0980d9d3e95a24461874d91836ef1f28`.
Патч ставится поверх сюжетного мира v1 с предыдущим асфальтом.

## Исправления

- Новая 3D-модель автобуса. В игре используются WebP-спрайты: 16 поворотов, 2 расцветки, один атлас 343304 байта. WebGL не нужен.
- Асфальт и пешеходные дорожки разделены на карте и в графе маршрутов. Люди могут только пересекать дорогу по зебрам: 7 на старте, 8 после открытия нового района.
- Серые зоны рисуются на земле, до зданий. Граница будущего района не пересекает участки жилых домов.
- Убраны лишние швы дороги и утечка стека Canvas.

Без изменений Worker, D1, валют, покупок и миграций. Личный город не перестраивается; новая модель автобуса общая для двух режимов.

## Запуск автономной сборки

Распакуйте автономный ZIP в отдельную папку и откройте `START_STORY_WORLD_v1_3.html`. Все изображения и код встроены. Это локальный тест, не реальная общая экономика.

## Установка в проект

Из корня проекта. Перед началом проверьте и сохраните незакоммиченные изменения.

```bash
(
set -e
git status --short
git switch main
git pull --ff-only origin main

unzip -o "$HOME/Downloads/Mir_Zeffi_City_Fix_v2_AutoInstall.zip" -d .
python3 scripts/apply-world-city-fix-v2.py --check
python3 scripts/apply-world-city-fix-v2.py

node scripts/check-world-city-fix-v2.mjs
node scripts/check-world-story-v1.mjs
node --test world/tests/city-life.test.mjs world/tests/story-world-v1.test.mjs world/tests/story-access-v1.test.mjs
node --test world/tests/*.test.mjs
node --no-warnings --experimental-sqlite scripts/check-zeffi-world-integration.mjs
node scripts/check-production-gate.mjs

git diff --check
git status --short
)
```

Установщик проверяет SHA-256 до записи, делает бэкап в `.world-city-fix-v2-backup/`, не перезаписывает неизвестные правки. Повторный запуск безопасен. Бэкапы автоматически исключаются из Git и публикации.

## Проверки

- 22/22 новых теста; 49/49 связанных тестов; 14 проверок подключения и синтаксиса.
- 21/21 локальная D1-проверка; 61 проверка production gate с `--skip-d1`.
- Полный world/tests: 216 успешных, 11 прежних ошибок исходной сборки. Новых падений нет.
- Заключительный прогон Wrangler D1 здесь не завершён: Wrangler 4.131.1 нет в кэше, загрузка пакетов недоступна.
- Браузер: 32 поворота/расцветки, 100 кадров без роста стека Canvas; серая зона не перекрывает 27980 проверенных пикселей дома. Ошибок JavaScript нет.
- 9 проверок установщика, включая откат при сбое записи.

**При ошибках тестов или gate не публикуйте обновление до разбора причин.**

## Git и production

Только после успешной проверки. `git add -A` добавит все локальные изменения.

```bash
(
set -e
git diff --check
git add -A
git diff --cached --check
git diff --cached --stat
git commit -m "fix(world): replace bus model, isolate pedestrians and correct district layers"
git push origin main
./update.sh
git status --short
git log -1 --oneline
)
```

Деплой здесь не выполнялся. Вход для тестеров и ограничения v1 не изменены.

Пересборка HTML: `python3 scripts/build-world-story-v1.py --output .story-standalone-output/START_STORY_WORLD_v1_3.html`.

## Состав патча

- `world/app.js`
- `world/citizens.js`
- `world/traffic.js`
- `world/renderer.js`
- `world/story/map.js`
- `world/story/app.js`
- `world/tests/clean-assets.test.mjs`
- `scripts/build-world-story-v1.py`
- `scripts/check-production-gate.mjs`
- `world/bus-art.js`
- `world/assets/transport-v2/bus-atlas.webp`
- `world/assets/transport-v2/manifest.json`
- `world/tests/city-transport-v2.test.mjs`
- `scripts/check-world-city-fix-v2.mjs`
- `.gitignore`, `.assetsignore`: исключения бэкапов и автономного HTML.

Для запуска игры новых npm/Python-зависимостей нет.
