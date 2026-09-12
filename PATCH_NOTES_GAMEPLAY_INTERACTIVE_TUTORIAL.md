# Gameplay Interactive Tutorial

Base
- Repository: `Edaedaeda1321/zefirok-run`
- Branch: `main`
- Base `index.html` Git blob: `4280aa1a3e82dcd8b6861d15adf5c17c8e9f85d5`
- The patch is intentionally small and overlays the current main only.

Files changed
- `index.html`
- `scripts/check-operation-system.mjs`

No backend / database changes
- `src/worker.js` is not changed.
- No D1 migration is added.
- No economy, purchase, case, booster or settlement endpoint is changed.

## What changed

The old detailed `Как играть` guide is retained in the guide directory, but the main first-run / replay entry now launches an action-driven gameplay coach.

Interactive sequence:
1. FullScreen
   - Highlights the real `[data-game-expand-toggle]` button.
   - The player must press it; there is no fake Next button.
2. Start
   - Highlights the real Start button.
   - The protected run is created by the existing authoritative flow.
3. Jump
   - The live run is frozen after the protected session is ready.
   - The player must tap the real stage (Space/Enter also works on desktop).
4. Obstacle
   - A dedicated tutorial pouf is spawned.
   - The player must actually jump over it.
   - A tutorial collision is safe: the obstacle is reset, the run is not ended, and Shield / Second Chance are not consumed.
5. Pickup
   - A dedicated tutorial marshmallow is spawned.
   - It is practice-only and does not add treats, coffee or score.
6. Done
   - The game freezes briefly and offers `Продолжить забег`.
   - Temporary tutorial objects are removed, normal spawn timings are restored, and the same protected run continues.

## UX details
- Coach mark spotlight dims the rest of the game and highlights the real target.
- Field steps use a CSS tap pulse; no emoji or new image asset is required.
- `Пропустить` is always available until the completion step.
- Unrelated controls are intercepted while the coach is waiting for a specific action.
- If FullScreen is already active, that step is skipped.
- The existing `tutorialCompleted` state remains the one-time auto-open authority, so already-trained existing accounts are not forcibly interrupted after this update.
- The `?` help button and profile replay entry open the interactive gameplay coach manually.
- If a real run is already active, replay is refused instead of destroying the current attempt.
- Existing detailed guide topics remain available under the game guide directory.

## Safety / production guards
`check-operation-system.mjs` now verifies that:
- the action-driven coach exists;
- FullScreen, jump, obstacle and pickup steps are present;
- the training obstacle cannot fall through to normal collision/booster handling;
- the deliberate tutorial freeze stops RAF scheduling;
- the tutorial pickup cannot grant score/resources;
- skip and resume actions remain wired.

## Verification performed
- Extracted outer and embedded `data-srcdoc` JavaScript: `node --check` PASS.
- `node scripts/check-operation-system.mjs`: 321 checks PASS.
- `node scripts/check-production-gate.mjs --skip-d1`: 11 checks PASS.
- `git diff --check` for both modified production files: PASS.

D1 was intentionally skipped for this local verification because the patch is client-only plus a static regression checker. Normal `./update.sh` will still run the project remote D1 gates before deployment.
