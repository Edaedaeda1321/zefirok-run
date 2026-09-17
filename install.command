#!/bin/bash
set -euo pipefail
PATCH_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$PWD"
if [ ! -f "$PROJECT_DIR/index.html" ] || [ ! -f "$PROJECT_DIR/battle-pass.html" ]; then
  echo "ОШИБКА: запусти install.command из корня zefirok-run."
  echo "Сейчас: $PROJECT_DIR"
  exit 1
fi
EXPECTED_INDEX="37f3922d3b37d0c2b77d736b7a6e12e2fe1c244f"
EXPECTED_BP="0c6605b353de78bdb09c38370295c0a36efdc68f"
CURRENT_INDEX="$(git hash-object "$PROJECT_DIR/index.html" 2>/dev/null || true)"
CURRENT_BP="$(git hash-object "$PROJECT_DIR/battle-pass.html" 2>/dev/null || true)"
if [ "$CURRENT_INDEX" != "$EXPECTED_INDEX" ] || [ "$CURRENT_BP" != "$EXPECTED_BP" ]; then
  echo "ОСТАНОВЛЕНО: локальные index.html/battle-pass.html отличаются от версии main, под которую собран патч."
  echo "index:       $CURRENT_INDEX"
  echo "battle-pass: $CURRENT_BP"
  echo "Ничего не заменено."
  exit 2
fi
cp "$PATCH_DIR/index.html" "$PROJECT_DIR/index.html"
cp "$PATCH_DIR/battle-pass.html" "$PROJECT_DIR/battle-pass.html"
echo "Готово: заменены только index.html и battle-pass.html. Папки проекта не затронуты."
echo "Теперь выполни:"
echo "  node scripts/check-production-gate.mjs"
echo "  git diff --check"
echo "  git status"
