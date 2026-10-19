МИР ЗЕФФИ — RC QA FIX / 17.10.2026

Этот ZIP устраняет найденный рассинхрон двух спрайт-манифестов и
актуализирует устаревшие ассетные тесты. Изменений экономики, Worker,
D1-схемы и личных сохранений игроков НЕТ. Версия игры остаётся 1.3.0.

ФАЙЛЫ:
 world/assets/manifest.json — недостающие 10 оригинальных стадий Дворца воспоминаний.
 world/tests/clean-assets.test.mjs — учёт сохранённого master-арта парка.
 world/tests/extra-pack.test.mjs — учёт нового престижного объекта.
 world/tests/flower-style.test.mjs — актуальные 429 спрайтов, 52 товара.
 world/tests/roads-restored-v013.test.mjs — полная сверка JSON и JS manifest.
 world/tests/sprite-assets.test.mjs — проверки точных live pack counts.
 world/docs/RC_AUDIT_20261017_RU.md — полный отчёт и релизные ограничения.

Корневые README_PATCH_RU.txt и COMMANDS_MAC_LINUX.txt — только инструкция,
не требуется добавлять в Git.

РЕЗУЛЬТАТЫ:
 node --test world/tests/*.test.mjs: до 421/426, после 426/426 PASS.
 node scripts/check-production-gate.mjs --skip-d1: 88 checks PASS.
 429 WebP: 0 missing, 0 bad decoding, 0 dimension mismatch.

Полный Wrangler D1, удалённая production D1, реальный iOS/Android Telegram
и настройки rollout не проверялись. Не включать публичный World автоматически.

Команды см. в COMMANDS_MAC_LINUX.txt.
