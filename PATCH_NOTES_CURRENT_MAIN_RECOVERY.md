# Current-main recovery patch — 2026-09-12

Base diagnosis
- Known-good runtime was present at commit `2775d62d83503c68d88e22f7a213c24f2bfde130`.
- Later commit `db04cc4e3b66866122e550cf6beabaac44623698` overlaid an older P2 copy of `index.html` and `src/worker.js` while fixing DB Doctor, unintentionally reverting newer gameplay/UI behavior.
- This patch is intentionally small and is meant to be overlaid on the CURRENT `main`. It does not include migrations, `.assetsignore`, DB Doctor, schema checker, or the user asset library.

Restored booster behavior
- Reward slot: max one active among `points`, `treats`, `coffee`.
- Helper slot: max one active among `shield`, `second_chance`, `pause`.
- One reward + one helper may coexist.
- Elite+ automatic x2 XP does not occupy either slot.
- Server rejects a second booster in the same group with `BOOSTER_GROUP_CONFLICT` before inventory is decremented.
- UI shows conflicting owned boosters as `Недоступно`, but the card remains clickable and explains the active conflict.
- Popup/HUD use the real booster asset instead of emoji.
- FullScreen HUD shows the concrete active booster and remaining runs.
- User-facing terminology is `Мои покупки`, including booster tutorials.

Pause fix
- Manual/fullscreen pause is debounced across pointer/click events.
- Hidden stale result/second-chance overlay classes no longer block pause.
- A minimal pause dialog is rendered before rich pause UI work; if the rich UI throws, the usable fallback stays visible.
- Restores `runCharacterProfile()` initialization in the rich pause dialog.

Delivery/monitoring fix
- Permanently unavailable Telegram chats (blocked, chat not found, deactivated, forbidden/cannot initiate) are separated from real/retryable delivery faults.
- Dead subscriber routes are marked inactive after a permanent Telegram delivery error and can become active again on a future `/start` through the existing subscriber upsert flow.
- Staff notification recipients are filtered to active bot subscribers.
- Daily report separates `Ошибок и повторных доставок` from `Недоступных Telegram-чатов`.
- Reward Queue red/critical failure count now means terminal `failed` rows with `attempts >= 5`; `failed` rows with attempts remaining stay in retry/pending state.

GitHub Actions / Unicode manifest fix
- Generated asset paths are normalized to Unicode NFC before they are written to manifests.
- This prevents macOS NFD filenames (for example `запасной`) from producing a different manifest than Linux/GitHub Actions (`запасной`).
- Content-manifest verification resolves NFC/NFD-equivalent filesystem components, so the same manifest works on macOS and Linux.
- Existing Russian locale ordering is preserved.

Production tooling restored
- `check-production-gate.mjs` again includes repository hygiene and D1 integration.
- `check-d1-integration.mjs` again covers migration 0088 retention/idempotency fixtures.
- `update.sh` keeps the safe order: production gate -> remote schema preflight -> DB Doctor -> Wrangler deploy.

No D1 migration is included or required.

Verification performed before packaging
- `node --check src/worker.js`: PASS.
- All executable scripts extracted from the game iframe `data-srcdoc`: PASS.
- `check-operation-system.mjs`: 301 checks PASS.
- Full production gate with `--skip-d1`: 11 checks PASS on a complete 87-migration / 455-image verification tree.
- Asset references: 309 files PASS.
- Asset manifest verifier: 455 files PASS, including a decomposed macOS filename resolved from an NFC manifest path.
- Re-generating all three manifests twice produced byte-identical files.
- Full local D1 integration was not claimed in the packaging environment because Wrangler execution timed out; the user's normal production gate will run it locally before deploy.

Important after overlay
Run the manifest generator BEFORE committing, because the GitHub workflow verifies that generated manifests are committed:

```bash
node scripts/check-assets.mjs --news-manifest
node scripts/check-production-gate.mjs

git status
git diff --check
git add -A
git commit -m "Restore booster groups and runtime fixes"
git push origin main

./update.sh
```

Do not run D1 migrations for this patch; the current database already reports no pending migrations.
