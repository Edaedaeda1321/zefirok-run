# Мир Зеффи — «Белый Кролик» + кафе «Зефирок», один landmark (v1)

## Что меняет

- Один общий игровой объект 4×4 `white-rabbit-zephirok` с 4 WebP из переданного пользователем REVIEW v1 архива, без изменения оригинальных фото.
- На сюжетной карте здание стоит по координатам `9,9` (вместо отдельного кафе). Старый отдельный «Белый Кролик» (вилла в районе справа) убран.
- Два самостоятельных маркера «Зефирок» и «Белый Кролик» ведут к одному физическому зданию. Маркер Белого Кролика доступен в главе 2; до этого показывает замок. Серой блокировки на действующем здании больше нет.
- Игрокам в личном городе добавлена новая покупка в разделе «Заведения»: **только с 5-го, максимального уровня города**; **120 000 очков + 300 зефира (0 кофе)**. 4×4 клетки, 15 минут строительства, +5 жителей, +48 уюта.
- Сервер по-прежнему проверяет покупку через `addObject(city,CATALOG)` и существующую Cloudflare Worker/D1 интеграцию. Без новых endpoint, списаний вне Worker и миграций.

## ВАЖНО о качестве ассетов

Входящий архив называется Review v1. Файлы `se/sw/nw/ne` имеют общий дизайн, но ракурсы **НЕ подтверждены как четыре реальные 90-градусные стороны**. Мы сохраняем исходные четыре изображения и осторожно используем их как направления; в metadata выставлено `directionVerified: false`. Для окончательной качественной ротации нужен настоящая 3D-модель или 4 физически отличных поворота. Не выдавать этот комплект за окончательно утверждённый.

## Файлы

Затронуты каталог, стоимость, движок (только эффекты жителей/уюта и ускорение строительства), локализация, два манифеста спрайтов, выбор изображений, сюжетная карта, маркеры и связанные регрессионные тесты. Патч не заменяет остальной проект и не трогает profile.html, кошелёк, миграции, Worker, мир игрока целиком или неподходящие ассеты. Добавлены 4 WEBP общей величиной примерно 0,5 МиБ.

## Установка (из корня `zefirok-run` на macOS)

Сначала изучить `git status --short`. Незакоммиченные изменения сохранить вручную. Не использовать `git reset --hard`. После скачивания ZIP в Загрузки:

```bash
(
set -e

git switch main
git pull --ff-only origin main
unzip -o "$HOME/Downloads/Mir_Zeffi_White_Rabbit_Zephirok_v1_AutoInstall.zip" -d .
python3 scripts/apply-white-rabbit-zephirok-v1.py --check
python3 scripts/apply-white-rabbit-zephirok-v1.py

node scripts/check-world-white-rabbit-v1.mjs
node scripts/check-world-story-v1.mjs
node scripts/check-world-city-fix-v2.mjs
node scripts/check-world-bus-rose-v3.mjs
node scripts/check-world-shop-v17.mjs
node --test world/tests/*.test.mjs
node --no-warnings --experimental-sqlite scripts/check-zeffi-world-integration.mjs
node scripts/check-production-gate.mjs

git diff --check
git status --short
)
```

Если любой тест не прошёл, НЕ выполнять публикацию. Отдельный `scripts/check-world-checks-v2-1.mjs` — историческая проверка первоначального установщика City Fix v2 и может требовать неизменных старых файлов. Она не является production gate и не доказывает регрессию этой новой функциональности.

Перед коммитом убедитесь, что в `git status --short` нет посторонних правок. `git add -A` добавляет всё, включая ранее незакоммиченные изменения. После полностью успешного release gate:

```bash
(
set -e
git diff --check
git add -A
git diff --cached --check
git diff --cached --stat
git commit -m "feat(world): add shared White Rabbit Zephirok landmark and prestige shop"
git push origin main
./update.sh
git status --short
)
```

Выполнять production деплой **только** через `./update.sh`. Прямой Wrangler не нужен. Установщик не делает git push, не меняет D1 и не деплоит код.

Автономная тестовая версия содержит `START_STORY_WORLD_White_Rabbit_Zephirok_v1.html`, который можно открыть локально без сервера; её нельзя распаковывать поверх исходного кода.
