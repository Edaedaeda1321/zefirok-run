DEPLOY WARNING CLEANUP - 2026-10-16

WHAT CHANGED
- world/ru.js: removed 13 earlier duplicate translation definitions.
  The final runtime value of EVERY RU key is exactly unchanged (230 keys verified).
- .assetsignore: exclude ASSETS_NEXT_STAGE.md from Cloudflare static asset uploads.

SAFETY
- No Worker, D1, schema, migrations, rewards, game balance, or API changes.
- No D1 migration is required.
- Verified with node --check, runtime key/value comparison, repository hygiene,
  and deploy asset boundary checks.
- This only removes build warnings; it is not a validation of the new reward feature.

APPLY from zefirok-run repository root:
  git status
  git pull --ff-only origin main
  unzip -o ~/Downloads/Sladkiy_Zabeg_Warnings_Cleanup_2026-10-16.zip -d .
  git diff --check
  npm run check:fast
  git add world/ru.js .assetsignore
  git commit -m "Clean up World translations and static asset excludes"
  git push origin main
  ./update.sh

If your git working tree has uncommitted changes, review them first before pulling.
Do not run an additional direct wrangler deploy; update.sh is the production flow.
