# Арты декора для CC: только готовые исходники, без генерации новых

# ID декора → UI-путь → пользовательский PNG источник

- `tree` → `/assets/mir_zeffi/decor-reward-thumbs/tree.webp` (RGBA 360×360) ← `роскошное_цветущее_дерево_в_вазоне.png`
- `flowerbed` → `/assets/mir_zeffi/decor-reward-thumbs/flowerbed.webp` (RGBA 360×360) ← `роскошная_сказочная_клумба_с_цветами.png`
- `lamp` → `/assets/mir_zeffi/decor-reward-thumbs/lamp.webp` (RGBA 360×360) ← `роскошный_розово_золотой_фонарь_фантазийного_город.png`
- `bench` → `/assets/mir_zeffi/decor-reward-thumbs/bench.webp` (RGBA 360×360) ← `розовый_садовый_диван_с_розами_и_сердцем.png`
- `fountain` → `/assets/mir_zeffi/decor-reward-thumbs/fountain.webp` (RGBA 360×360) ← `волшебный_розовый_фонтан_с_розами.png`
- `monument` → `/assets/mir_zeffi/decor-reward-thumbs/monument.webp` (RGBA 360×360) ← `глянцевый_памятник_с_милым_щенком.png`
- `extra-flowerbed` → `/assets/mir_zeffi/decor-reward-thumbs/extra-flowerbed.webp` (RGBA 360×360) ← `роскошная_цветочная_клумба_с_золотым_декором.png`
- `extra-bush` → `/assets/mir_zeffi/decor-reward-thumbs/extra-bush.webp` (RGBA 360×360) ← `розовый_цветущий_куст_в_золотом_кашпо.png`
- `extra-tree` → `/assets/mir_zeffi/decor-reward-thumbs/extra-tree.webp` (RGBA 360×360) ← `волшебная_сакура_с_золотыми_фонариками.png`
- `extra-lamp` → `/assets/mir_zeffi/decor-reward-thumbs/extra-lamp.webp` (RGBA 360×360) ← `роскошный_фонарь_с_розами.png`

## Декор, использующий существующие игровые WebP

- `extra-bench` → `/world/assets/flower-style-v1/webp/decor/bench_n.webp`
- `extra-planter` → `/world/assets/extra/webp/decor/decor_planter.webp`
- `extra-arch` → `/world/assets/extra/webp/decor/decor_arch.webp`
- `extra-fountain` → `/world/assets/flower-style-v1/webp/decor/fountain_n.webp`
- `extra-sign` → `/world/assets/extra/webp/decor/decor_sign.webp`
- `extra-sweet_object` → `/world/assets/extra/webp/decor/decor_sweet_object.webp`

## Дворец (все WebP байт-в-байт из архива)
Размер каждого файла 1024×1024, альфа RGBA. Ракурс `n`, точка визуальной привязки из пакета `(512,934)`; фактическое позиционирование рендером калибруется в `worldSpriteGroundFit`. Логическая площадка 6×6 — решение интеграции, не исходное свойство обзорного набора.

- 01. `palace_memories_build_01.webp` → `palace_memories_01` — Подготовка территории
- 02. `palace_memories_build_02.webp` → `palace_memories_02` — Фундамент
- 03. `palace_memories_build_03.webp` → `palace_memories_03` — Нижние стены
- 04. `palace_memories_build_04.webp` → `palace_memories_04` — Залы и арки
- 05. `palace_memories_build_05.webp` → `palace_memories_05` — Каркас купола
- 06. `palace_memories_build_06.webp` → `palace_memories_06` — Обшивка купола
- 07. `palace_memories_build_07.webp` → `palace_memories_07` — Остекление
- 08. `palace_memories_build_08.webp` → `palace_memories_08` — Декоративная отделка
- 09. `palace_memories_build_09.webp` → `palace_memories_09` — Подготовка к открытию
- 10. `palace_memories_complete.webp` → `palace_memories_10` — Готовый дворец

**Статусы:** `stage=1..9` — строится общий объект; `stage=10` — открыт. Только owner CC меняет shared stage. У личного игрока стадия 1..9 определяется временем строительства (24 ч), в момент готовности показывается 10. Взносы в общий дворец отсутствуют в коде Worker.

**Не путать:** картинки каталога CC — отдельные миниатюры. Для размещённых старых декораций в личном городе сохраняются текущие игровые спрайты; существующий рендер не заменён новым артом без всех направлений и точных якорей.
