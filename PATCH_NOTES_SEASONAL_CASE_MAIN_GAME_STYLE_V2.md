# Seasonal Case Main Game Style Hotfix v2

Основа: production-логика сезонного пропуска после hotfix v6 + предыдущая анимация сезонного кейса.

## Что изменено

### 1. Сезонный кейс теперь открывается в стиле обычных кейсов основной игры
Старая отдельная упрощённая анимация удалена.

Перенесена логика визуального открытия обычных кейсов:
- подготовка перед серверным подтверждением;
- закрытый кейс -> открытый кейс;
- те же принципы тайминга, scale/flash/rays/particles;
- progress line;
- возможность коснуться кейса и ускорить открытие;
- закрытие заблокировано во время активной анимации;
- haptic feedback в момент раскрытия.

Для сезонного варианта изменено только оформление:
- фон: ночное кафе Season 2 (`assets/optimized/v0.79.5/background_season2.webp`);
- лилово-лунная палитра;
- используются реальные `imageUrl` и `openImageUrl` сезонного кейса из Control Center / server state.

То есть если в Control Center заменить закрытый или открытый арт сезонного кейса, анимация автоматически возьмёт новые изображения.

### 2. `Вот это улов!`
После сезонного кейса верхняя иконка результата больше не показывает обычный золотой кейс.
Теперь там показывается ОТКРЫТЫЙ арт именно того сезонного кейса, который был открыт.

Дополнительно:
- kicker меняется на `СЕЗОННЫЙ КЕЙС`;
- под заголовком показывается название сезонного кейса;
- обычные награды Battle Pass используют прежнее оформление summary.

### 3. icon_prize.png вместо видимого 🎁 в web UI
`icon_prize.png` включён в патч.
В legacy `profile.html` заменены оставшиеся видимые gift emoji:
- fallback награды рейтинга;
- подсказка `Подарки и компенсации`;
- badge ожидающего подарка друзей.

Основная игра, Battle Pass, Achievements, Rating, Referrals, Test Project и Control Center уже используют `/assets/ui/icon_prize.png` или преобразуют legacy gift icon в PNG.

## Изменённые файлы
- `battle-pass.html`
- `profile.html`
- `assets/ui/icon_prize.png`

## Backend
- `src/worker.js` не менялся.
- D1 migrations не нужны.
- Wrangler deploy Worker для этого патча не требуется, если `update.sh` разворачивает только статические файлы отдельно. Следуй обычному production deploy процессу проекта.

## Проверки
- inline JavaScript `battle-pass.html`: syntax OK
- inline JavaScript `profile.html`: syntax OK
- `node scripts/check-live-content-assets.mjs`: passed
- `node scripts/check-asset-manifest.mjs`: passed
