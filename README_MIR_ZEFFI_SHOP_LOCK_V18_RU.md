# Мир Зеффи — исправление закрытых карточек магазина v18

**Исходник:** актуальный GitHub `main` после v17, 2026-10-11. Патч только для UI каталога.

## Причина

В `world/world.css` есть правило `.catalog-figure span { font-size:38px; position:relative; ... }`.
В v17 поверх картинки создавался `<span class="catalog-level-lock">🔒 Ур. 2</span>`.
Селектор базовой темы (`.catalog-figure span`) специфичнее, чем `.catalog-level-lock`, поэтому шрифт становился огромным и текст обрезался.

## Что меняет v18

- `world/app.js`: вместо emoji и текста в спрайте используется отдельный `<div class="catalog-lock-mark"><img ...icon_closed.webp...></div>`.
- `world/premium-ui.css`: замок 34px / 29px на узких экранах, центр поверх приглушённого здания. Без прямоугольной белой плашки.
- `world/build-standalone.py`: уже существующий `assets/ui/icon_closed.webp` встраивается в автономный HTML как data URI.
- `scripts/check-world-shop-lock-v18.mjs`: 12 проверок вёрстки, сохранения уровня и пути к изображению.

**Использован ровно тот же WebP, что в закрытых наградах `battle-pass.html`.** Графика не генерировалась и не перерисовывалась. В production новый WebP не добавляется: используется файл, который уже есть в проекте.

Не меняются: `world/economy.js`, `world/catalog.js`, `world/engine.js`, `src/zeffi-world-service.js`, D1, стоимость, уровни, цены, балансы и сохранения.

## Установка

Открой терминал в корне репозитория `zefirok-run`, сохрани уже существующие изменения в Git или отдельную резервную ветку.

```bash
git status --short
git switch main
git pull --ff-only origin main
unzip -o "$HOME/Downloads/Mir_Zeffi_Shop_Locked_Cards_v18_patch.zip" -d .
python3 scripts/apply-world-shop-lock-v18.py --check
python3 scripts/apply-world-shop-lock-v18.py
node scripts/check-world-shop-lock-v18.mjs
node --check world/app.js
node --test world/tests/*.test.mjs
node --no-warnings --experimental-sqlite scripts/check-zeffi-world-integration.mjs
node scripts/check-production-gate.mjs
git diff --check
```

Если установщик, тесты или production gate выдают ошибку — НЕ коммить и не публикуй. При локально изменённом `world/app.js` установщик отказоустойчиво завершится с ошибкой вместо перезаписи файла целиком.

## GitHub и production

После успешных проверок:

```bash
git add world/app.js world/premium-ui.css world/build-standalone.py \
  scripts/apply-world-shop-lock-v18.py scripts/check-world-shop-lock-v18.mjs \
  README_MIR_ZEFFI_SHOP_LOCK_V18_RU.md
git diff --cached --check
git diff --cached --stat
git commit -m "fix(world): match locked shop cards to season pass reward art"
git push origin main
./update.sh
```

## Проверить вручную на iPhone

- На уровне 1 открыть «Все»: семейный дом (ур. 2), коттедж (ур. 3), вокзал (ур. 4) должны показывать **небольшой реальный замок поверх видимого изображения**, а не огромный текст.
- Под ценой должна остаться подпись о требуемом уровне.
- При нажатии открывается подсказка, покупка не проходит.
- После получения нужного уровня замок исчезает; изображение становится насыщенным.
- При нехватке валюты уже открытый объект показывает требуемые суммы; иконка замка отсутствует.
- После повторного открытия магазина и на 320px ширине элементы не выходят за пределы карточки.

Автономная версия v18 создана исключительно для просмотра, D1 и production кошельки не задействует.
