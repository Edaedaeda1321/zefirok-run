# Мир Зеффи — транспорт 3D + отдельная асфальтовая дорога v1

Что обновлено:
- транспорт в `world/traffic.js` перерисован в более объёмный premium casual 3D-стиль;
- в story world добавлена отдельная сеть `busRoads` для общественного транспорта;
- в `world/renderer.js` добавлен визуальный рендер тёмной асфальтовой дороги с разметкой;
- автобусы больше не едут по общей пешеходной дороге в story map;
- обновлён тест `world/tests/story-world-v1.test.mjs` под новую dedicated transit lane логику.

Затронутые файлы:
- `world/traffic.js`
- `world/renderer.js`
- `world/story/map.js`
- `world/tests/story-world-v1.test.mjs`

Установка:
```bash
unzip -o "$HOME/Downloads/Mir_Zeffi_Transport_3D_Asphalt_v1_AutoInstall.zip" -d .
python3 scripts/apply-world-transport-3d-asphalt-v1.py --check
python3 scripts/apply-world-transport-3d-asphalt-v1.py
```

Проверка после установки:
```bash
node --check world/traffic.js
node --check world/renderer.js
node --check world/story/map.js
node --test world/tests/city-life.test.mjs world/tests/story-world-v1.test.mjs world/tests/story-access-v1.test.mjs
```

Поведение:
- изменение визуальное и маршрутное только для story world / общего города;
- сервер, D1, кошелёк, реальные валюты и API не меняются.
