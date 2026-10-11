# Мир Зеффи — NPC и постройки v15 (2026-10-11)

## Какая причина найдена
В `drawWorld()` рендерер сортировал все объёмные здания по дальнему углу их занимаемых клеток (`x+y+w+h`), а NPC — по положению ног (`x+y`). Из-за этого, даже когда NPC стоял на дороге *перед* площадкой, её спрайт рисовался поверх человека. На снимке казалось, будто он идёт под постройкой. Также в ранее созданных городах могли остаться дороги под поднятыми декоративными площадями — прежние пути NPC не учитывали эти наложения.

## Что сделано
* `world/renderer.js`: объёмные объекты сортируются по центральной наземной точке footprint (`x+y+(w+h)/2`), согласованно с ногами NPC. Перед площадкой персонаж рисуется перед её основанием, за постройкой — за её силуэтом.
* `world/citizens.js`: новый чисто визуальный `walkableCitizenRoads()` исключает дорожные клетки, реально занятые установленным 3D-объектом, включая старые наложения площадей. Плоскую плитку поверх дорог сохраняет. Пешеходный маршрут строится только по соседним доступным дорожным клеткам — без телепортации между разорванными участками.
* Отдельные regression-тесты: все текущие солидные виды построек по четырём поворотам, старые наложения, безопасные маршруты, видимый порядок перед/за строением, без изменения сохранений и кошельков.

## Важно
* Не изменяются D1, Worker, экономика, сохранённые позиции зданий, купленные дороги, население и уровни города.
* Если в старом городе осталась физически перекрытая поднятой площадью дорога, пешеходы не будут по ней ходить. Исправление v14 для хранения проблемных площадей на складе сохраняется.
* Не перерисовываются сами WebP и не изменяются их точки опоры. Визуальный результат проверен в Chromium, а в Telegram на реальном iPhone необходимо подтвердить после публикации.
* Нужен последний актуальный `main` с исправлениями v14. Архив содержит `git apply`-патч: при несовпадении файлов установка останавливается вместо их замены старыми версиями.

## Установка (из корня zefirok-run)
```bash
unzip -o "$HOME/Downloads/Mir_Zeffi_NPC_Road_Occlusion_v15_patch.zip" -d .
git apply --check patches/mir_zeffi_npc_occlusion_v15.patch
git apply patches/mir_zeffi_npc_occlusion_v15.patch
node --check world/citizens.js
node --check world/renderer.js
node scripts/check-world-citizen-occlusion-v15.mjs
node --test world/tests/*.test.mjs
node --no-warnings --experimental-sqlite scripts/check-zeffi-world-integration.mjs
node scripts/check-world-raised-plazas-v14.mjs
node scripts/check-production-gate.mjs
git diff --check
```
Если любая команда с ошибкой — STOP, ничего не публиковать.

## GitHub и прод
```bash
rm -f patches/mir_zeffi_npc_occlusion_v15.patch
git add world/citizens.js world/renderer.js world/tests/citizen-footprint-occlusion-v15.test.mjs \
  scripts/check-world-citizen-occlusion-v15.mjs README_MIR_ZEFFI_NPC_OCCLUSION_V15_RU.md
git diff --cached --check
git diff --cached --stat
git commit -m "fix(world): keep citizens on walkable roads and fix building depth"
git push origin main
./update.sh
```

## Автономный тест
Отдельно прилагается `Mir_Zeffi_Citizens_Road_Occlusion_v15_OFFLINE.html`, самодостаточный браузерный HTML, не подключённый к production D1. Он создан из v14 автономной игры с теми же изменениями в `world/citizens.js` и `world/renderer.js`. Тестовый кошелёк сохранён, доступ к основной базе отсутствует.

Протестировать рядом стоящие объекты: детская площадка, клумбы, автобусная остановка, большой парк, дом и декоративный постамент. Персонажи на дорогах за домом могут быть им частично закрыты — это корректная изометрическая глубина; но они не должны оказаться на клетках внутри фундамента, а перед строением должны рисоваться поверх его переднего края.
