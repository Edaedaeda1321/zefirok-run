# Исправление повторных Duplicate key + служебных файлов

Дата: 16 октября 2026. Подготовлено для актуальной `main` репозитория `Edaedaeda1321/zefirok-run` после установки патча Дворца воспоминаний.

## Что изменено

- `world/ru.js`: удалены 13 ранних объявлений ключей, значения которых перезаписывались последующими. Проверена полная идентичность всех **232 реально используемых переводов** до и после.
- `.assetsignore`: запрещены к публикации `ASSET_MAPPING_RU.md` и `PATCH_FILE_SHA256.json`.
- `scripts/check-deploy-assets.mjs`: проверяет наличие обоих обязательных запретов в `.assetsignore`.
- `scripts/check-repo-hygiene.mjs`: обнаруживает повторные ключи перевода в `world/ru.js`, включая несколько свойств в одной строке, и блокирует существующий `production gate` при регрессии.

Причина возвращения предупреждений: крупный ZIP-патч Дворца содержал более старую редакцию `world/ru.js`, которая перезаписала предыдущую очистку.

## Исходные версии (git blob SHA)

Убедитесь, что в `main` ещё действуют эти исходные версии файлов; иначе сначала сравните изменения и не переписывайте файлы вслепую.

| Файл | До | После |
|---|---|---|
| `.assetsignore` | `c6f49af491fae5b432991d17d6c10b9ea767e18d` | `98dbe32a3dad5c43e10c53716477c8625f11391b` |
| `world/ru.js` | `c3ee6e2c3d6f2ab5c61f4dfcb238aed86916d05c` | `2c4972236cbf14adf2bbc2afec838c1bd8d3613c` |
| `scripts/check-deploy-assets.mjs` | `e0fccd6b81a07a9c9e7c119431795ca88d9b8cb0` | `d7a00e7d5d37bbdc6b85e2367027d7a8d21f32b7` |
| `scripts/check-repo-hygiene.mjs` | `6a8989eea8eacb69af5cc4fad6e3fbfbae39a83f` | `261a8e652919bc0781585b4a555a5e10e050f3cf` |

## Команды

Выполнить в корне `zefirok-run`. Перед распаковкой убедиться, что нет посторонних незакоммиченных изменений.

```bash
git status
git pull --ff-only origin main
unzip -o ~/Downloads/Sladkiy_Zabeg_Warnings_Regression_Guard_2026-10-16.zip -d .
node scripts/check-repo-hygiene.mjs
node scripts/check-deploy-assets.mjs
npm run check:fast
git diff --check
git add .assetsignore world/ru.js scripts/check-deploy-assets.mjs scripts/check-repo-hygiene.mjs
git commit -m "Prevent recurring World translation warnings and private asset uploads"
git push origin main
./update.sh
```

Миграции D1 не нужны. Скрипт `./update.sh` уже выполняет production gate; `npx wrangler deploy` отдельно запускать не нужно.

После деплоя проверить, что обе служебные ссылки больше не публикуются.

## Проверки перед упаковкой

- Node.js синтаксис обоих скриптов пройден
- Действующие переводы RU до/после идентичны (232 ключа)
- Проверены негативные сценарии: новый дублирующий ключ и пропуск правила `.assetsignore` блокируют деплой
- `npm run check:fast`: production gate, 85 шагов, пройден локально; D1 проверки пропущены согласно режиму `--skip-d1`
- Другие файлы, база, миграции и игровая экономика не затронуты
