#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$REPO_ROOT" ]]; then
  echo "Ошибка: запустите команду внутри папки репозитория zefirok-run."
  exit 1
fi

cd "$REPO_ROOT"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Обновление остановлено: в репозитории есть незакоммиченные изменения."
  echo "Сначала выполните git status и сохраните или отмените локальные изменения."
  exit 1
fi

echo "1/4 Переключаемся на main..."
git checkout main

echo "2/4 Получаем последнюю версию..."
git pull --ff-only origin main

echo "3/4 Применяем новые D1-миграции..."
npx wrangler d1 migrations apply zefirok-rewards --remote

echo "4/4 Публикуем Cloudflare Worker..."
npx wrangler deploy

echo
echo "Готово: код обновлён, миграции применены, Worker опубликован."
echo "Проверка API: https://zefirok-run.patokad6.workers.dev/api/health"
