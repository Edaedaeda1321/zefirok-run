МИР ЗЕФФИ — КНОПКА + ЗАГЛУШКА ДЛЯ ВСЕХ (UI PATCH v1)
===============================================

Источник для патча: Edaedaeda1321/zefirok-run, ветка main,
commit c3bbaa8594c5f3ff4322eae80525b2724f1c1693 (9 октября 2026).
Перед наложением убедитесь, что локальный репозиторий соответствует этому коммиту.
Если main изменился — не перезаписывайте index.html вслепую, адаптируйте патч.

Что изменено:
- На главном экране СРАЗУ ПОД ВКЛАДКАМИ ИГРА / МАГАЗИН / МОИ ПОКУПКИ / ПРОФИЛЬ
  две кнопки одинаковой ширины в один ряд: "Задания" (слева) и "Мир Зеффи" (справа).
- Старая кнопка заданий не дублируется, обработчик и индикаторы заданий сохранены.
- Новая кнопка использует assets/ui/icon_world_zeffi.webp (PNG -> WebP).
- Нажатие "Мир Зеффи" открывает встроенную страницу-заглушку с изображением
  assets/ui/icon_blocked_stranicha.webp (PNG -> WebP), статусом "ПОКА НЕДОСТУПНО",
  текстом о строительстве города и кнопкой "Вернуться к забегу".
- Настоящий конструктор закрыт на публичной /world.html, включая ?world_preview=1;
  локальная standalone-песочница по localhost/file:// сохранена для разработки.
- Новая страница использует штатное переключение экранов через switchScreen,
  существующие разделы, задачи и игровой процесс не переписаны.
- Worker src/worker.js, D1, балансы, миграции, update.sh и env/секреты НЕ МЕНЯЛИСЬ.

БЕЗОПАСНАЯ УСТАНОВКА (на Mac, из ZIP):

  cd "/Users/daniil.patoka/Documents/Codex/2026-07-19/new-chat/outputs/zefirok-run"
  git status --short
  git rev-parse HEAD

Если SHA отличается от c3bbaa8594c5f3ff4322eae80525b2724f1c1693
или есть незафиксированные изменения этих 7 файлов, остановиться и сверить.
Рекомендуем не изменять production main напрямую, а создать отдельную ветку:

  git switch -c feature/world-coming-soon-home
  unzip -o "$HOME/Downloads/Mir_Zeffi_Home_Locked_UI_Patch_v1.zip" -d .

Затем проверить:

  node scripts/check-index-srcdoc.mjs
  node scripts/check-world-api-wiring.mjs
  node scripts/check-world-integration.mjs
  node scripts/check-asset-manifest.mjs
  node scripts/check-assets.mjs
  node scripts/check-production-gate.mjs

Дальше проверить git diff и закоммитить только эти 7 файлов:

  git add index.html world.html assets/ui/icon_world_zeffi.webp assets/ui/icon_blocked_stranicha.webp assets/images-manifest.json scripts/check-world-api-wiring.mjs scripts/check-world-integration.mjs
  git commit -m "Add Мир Зеффи coming soon button and locked page"
  git push -u origin feature/world-coming-soon-home

Открыть PR: https://github.com/Edaedaeda1321/zefirok-run/compare/main...feature/world-coming-soon-home?expand=1
После зелёного GitHub Production Gate объединить PR, затем отдельно
публиковать стандартной командой ./update.sh с реальной проверкой Cloudflare.

Важно:
- Эта ZIP-сборка НЕ меняет удалённый GitHub и НЕ публикует Worker автоматически.
- В браузере/Telegram новый экран закрыт для всех на уровне UI и /world.html.
- Существующее серверное API /api/world/* по-прежнему зависит от WORLD_ENABLED
  и WORLD_TESTER_IDS. Если нужны закрытые API без исключения для тестеров,
  подтвердите, что WORLD_ENABLED=false в Cloudflare. Эта переменная не менялась.
- Не сбрасывайте D1 и не применяйте повторно миграцию 0114 для такого UI-патча.

Верификация при создании:
- 56 локальных gate-проверок (D1 integration не выполнен в sandbox из-за
  недоступности скачивания Wrangler; в CI запускать полный gate).
- World API wiring PASS, world integration PASS, asset manifest 594 PASS.
- Мобильный UI браузер-тест: кнопка -> заглушка -> возврат PASS.
- Прямая hosted страница /world.html показывает заглушку и не инициализирует игру.
