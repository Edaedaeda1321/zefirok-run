Сладкий Забег — быстрый показ «Моей витрины»

Проблема
- При холодном запуске startup даёт витрине ограниченный бюджет 900 мс.
- Если этот участок не успевает, профиль раньше ждал общую /api/profile/overview, а только потом делал отдельный recovery-запрос.
- Серверный preview витрины также повторял legacy schema/PRAGMA проверки, хотя player API уже проходит общий runtime schema contract.

Что меняется
1. Если startup не успел вернуть achievementShowcase, отдельное восстановление запускается сразу в фоне.
2. При первом открытии без кэша «Моя витрина» сначала использует лёгкий /api/achievements scope=profile, а не ждёт общую сводку профиля.
3. Последнее корректное состояние по-прежнему показывается из localStorage немедленно.
4. achievementShowcasePreviewForPlayer больше не повторяет legacy schema-repair на player read path.
5. Сезонные определения достижений в этом fast path используют уже проверенный runtime schema contract.
6. Добавлены production-gate инварианты в scripts/check-p1-read-paths.mjs.

База данных / migration
- Новая migration НЕ требуется.
- Формат данных витрины не меняется.
- Server-authoritative логика достижений не переносится на клиент.

Применение из корня репозитория:
  git apply --check ProfileShowcase_FastLoad_Fix/profile-showcase-fast-load.patch
  git apply ProfileShowcase_FastLoad_Fix/profile-showcase-fast-load.patch

Проверка:
  node --check src/worker.js
  node scripts/check-p1-read-paths.mjs
  git diff --check

После проверки:
  git status
  git add -A
  git commit -m "Speed up profile achievement showcase"
  git push origin main
  ./update.sh
