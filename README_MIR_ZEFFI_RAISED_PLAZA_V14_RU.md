# Мир Зеффи v14 — настоящая причина «летающего» дома

## Что исправлено

На скриншоте дом визуально стоял на колонне `plaza-monument-base`.
Причина: прежний каталог помечал все 8 «площадей» (`plaza-*`) как плоский `layer:'surface'`,
несмотря на реальные высокие декоративные элементы внутри их WebP (колонна, лавки,
деревья, фонари, игровая площадка). Поэтому движок разрешал совпадение занимаемых
клеток с домами и дорогами, а рендерер всегда рисовал эти объекты под зданиями.
Предыдущие сдвиги Y и тени эту проблему не исправляли.

В патче:
1. Восьми 3D-площадям присвоен маркер `blockingSurface:true`, **не меняя их ID,
   footprint, цены, владение или сохранённые координаты**.
2. Новые здания, предметы декора и дороги не могут пересечься с объёмной площадью.
   Важно: ранее разрешённое размещение памятника или другой постройки поверх
   такой площади тоже будет запрещено. Плоские декоративные покрытия/дороги
   по-прежнему обрабатываются отдельно.
3. Объёмные площади рисуются в общей глубинно-отсортированной 3D-сцене,
   а не в слое фоновых напольных плиток.
4. Старые сохранения, уже содержащие такие пересечения, **остаются читаемыми**.
   Не включается автоматическое перемещение или удаление дорог/домов.
5. При старом пересечении появляется мобильное окно «Найдено пересечений».
   Кнопка «Убрать перекрытые площади на склад» вызывает существующую
   серверную `store`-операцию с проверкой revision/receipt. Дом, баланс, права
   собственности и награды не меняются. Площадь остаётся на складе и может
   быть снова установлена на свободном участке **без покупки**.
   «Позже» закрывает окно без изменений (оно снова появится при новом входе).

## Состав пакета

- `patches/mir_zeffi_raised_plaza_v14.patch` — безопасный unified Git diff к
  **актуальному GitHub main, проверенному 2026-10-11**, а не замена старых файлов.
- `README_MIR_ZEFFI_RAISED_PLAZA_V14_RU.md` — это описание.

После `git apply` изменяются ТОЛЬКО:
- `world/catalog.js`
- `world/engine.js`
- `world/renderer.js`
- `world/app.js`
- `world/premium-ui.css`
- `world/tests/extra-pack.test.mjs`
- `world/tests/paid-economy.test.mjs`
- новый `world/tests/raised-plaza-overlap-v14.test.mjs`
- новый `scripts/check-world-raised-plazas-v14.mjs`

**Worker, миграции D1, кошелёк, другие WebP и ассеты не затрагиваются.**

## Установка

1. Сохрани ZIP в `$HOME/Downloads/Mir_Zeffi_Raised_Plaza_Ground_Fix_v14_patch.zip`.
2. Открой терминал в корне локального `zefirok-run`.
3. Убедись, что нет незакоммиченных несовместимых изменений. Если есть —
   сначала сохрани их отдельным коммитом или согласуй с Codex; НЕ делай `git add .`.
4. Выполни:

```bash
git status --short
git switch main
git pull --ff-only origin main
unzip -o "$HOME/Downloads/Mir_Zeffi_Raised_Plaza_Ground_Fix_v14_patch.zip" -d .
git apply --check patches/mir_zeffi_raised_plaza_v14.patch
git apply patches/mir_zeffi_raised_plaza_v14.patch
node scripts/check-world-raised-plazas-v14.mjs
node --test world/tests/*.test.mjs
node --no-warnings --experimental-sqlite scripts/check-zeffi-world-integration.mjs
node scripts/check-world-new-city-pack.mjs
node scripts/check-production-gate.mjs
git diff --check
git diff --stat
```

Если любая проверка не прошла — ОСТАНОВИСЬ, НЕ ПУБЛИКУЙ.

После успешных проверок:

```bash
rm -f patches/mir_zeffi_raised_plaza_v14.patch
git add world/catalog.js world/engine.js world/renderer.js world/app.js \
  world/premium-ui.css world/tests/extra-pack.test.mjs \
  world/tests/paid-economy.test.mjs world/tests/raised-plaza-overlap-v14.test.mjs \
  scripts/check-world-raised-plazas-v14.mjs \
  README_MIR_ZEFFI_RAISED_PLAZA_V14_RU.md
git diff --cached --check
git diff --cached --stat
git commit -m "fix(world): prevent raised plaza overlaps and recover legacy towns"
git push origin main
./update.sh
```

**Не запускай прямой `wrangler deploy`.** Здесь принят порядок `git push origin main` → `./update.sh`.

## Проверки сборки

На восстановленной версии текущего `main`:
- `node --test world/tests/*.test.mjs`: 73/73 PASS.
- Локальная D1-проверка для системы уровней: 22/22 PASS.
- Локальная D1-проверка новых построек: 20/20 PASS.
- 112/112 WebP New City Pack: PASS, новые графические файлы не создавались.
- Проверка сцены в Chromium: `plaza-monument-base` + жилой дом,
  ранее сохранённый конфликт, нажатие кнопки «На склад», идентичный кошелёк,
  отсутствие новых ошибок JS — PASS, включая мобильную ширину 393 px.

Изоляция тестов: в рабочем контейнере нет полного актуального корня
production и штатного окружения Cloudflare, поэтому весь `check-production-gate`
на настоящем локальном репозитории необходимо запустить по командам выше.

## Проверка в Telegram

После деплоя открой город, где дом стоит над постаментом.
Нажми «Убрать перекрытые площади на склад». Только после подтверждения
несовместимая площадь исчезнет из-под дома. Убедись, что дом остался,
а площадь доступна на складе, и попробуй установить её на свободные клетки.
Повтори проверку для 3×3 площадей, других домов и дорог.

Если постройка по-прежнему кажется парящей, но **нет пересечения с
объёмной площадью**, это отдельная проблема исходной 3D-геометрии конкретного
WebP; этот патч не утверждает, что пересобирает такие исходные изображения.
