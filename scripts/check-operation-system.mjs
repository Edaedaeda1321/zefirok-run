import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workerPath = path.join(root, 'src', 'worker.js');
const indexPath = path.join(root, 'index.html');
const battlePassPath = path.join(root, 'battle-pass.html');
const assetCheckPath = path.join(root, 'scripts', 'check-assets.mjs');
const assetManifestCheckPath = path.join(root, 'scripts', 'check-asset-manifest.mjs');
const worker = fs.readFileSync(workerPath, 'utf8');
const index = fs.readFileSync(indexPath, 'utf8');
const battlePass = fs.readFileSync(battlePassPath, 'utf8');
const assetCheck = fs.readFileSync(assetCheckPath, 'utf8');
const assetManifestCheck = fs.readFileSync(assetManifestCheckPath, 'utf8');
const playerUiPaths = ['index.html','battle-pass.html','rating.html','referrals.html','achievements.html','album.html','legal.html'];
const playerUis = playerUiPaths.map((name) => [name, fs.readFileSync(path.join(root, name), 'utf8')]);

let checks = 0;
function assert(condition, message) {
  checks += 1;
  if (!condition) {
    console.error(`OPERATION CHECK FAILED: ${message}`);
    process.exitCode = 1;
  }
}
function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert(start >= 0, `missing section start: ${startMarker}`);
  if (start < 0) return '';
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert(end > start, `missing section end after: ${startMarker}`);
  return end > start ? source.slice(start, end) : source.slice(start);
}
function assertOrder(source, first, second, label) {
  const a = source.indexOf(first);
  const b = source.indexOf(second);
  assert(a >= 0, `${label}: missing recovery marker`);
  assert(b >= 0, `${label}: missing availability marker`);
  assert(a >= 0 && b >= 0 && a < b, `${label}: recovery must happen before availability gate`);
}
function extractNamedFunction(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert(start >= 0, `missing function for behavior test: ${name}`);
  if (start < 0) return '';
  const parenStart = source.indexOf('(', start);
  let parenDepth = 0;
  let signatureQuote = '';
  let signatureEscaped = false;
  let bodyStart = -1;
  for (let i = parenStart; i < source.length; i += 1) {
    const char = source[i];
    if (signatureQuote) {
      if (signatureEscaped) signatureEscaped = false;
      else if (char === '\\') signatureEscaped = true;
      else if (char === signatureQuote) signatureQuote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') { signatureQuote = char; continue; }
    if (char === '(') parenDepth += 1;
    else if (char === ')') {
      parenDepth -= 1;
      if (parenDepth === 0) { bodyStart = source.indexOf('{', i + 1); break; }
    }
  }
  assert(bodyStart >= 0, `missing function body for behavior test: ${name}`);
  if (bodyStart < 0) return '';
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = bodyStart; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  assert(false, `unclosed function for behavior test: ${name}`);
  return '';
}

assert(worker.includes('const PLAYER_OPERATION_CONTRACT_VERSION = 1;'), 'Worker operation contract version is missing');
assert(worker.includes('code: "FEATURE_TEMPORARILY_DISABLED"'), 'standard disabled code is missing');
assert(worker.includes('operationCode: "FEATURE_TEMPORARILY_DISABLED"'), 'standard operation disabled code is missing');
assert(worker.includes('function assertOperationQuotedPrice'), 'shared price quote validator is missing');
assert(worker.includes('async function requirePlayerOperationAvailable'), 'shared operation availability gate is missing');
assert(worker.includes('if (settings.degraded) throw playerOperationError(503'), 'degraded maintenance state does not fail safe');
assert(worker.includes('state: "completed"'), 'operation completion state is missing');

const maintenance = section(worker, 'const RECOVERY_AWARE_OPERATION_PATHS', '\nfunction maintenanceKeyboard');
for (const endpoint of [
  '/api/rewards/create', '/api/skins/purchase', '/api/skins/bonus-case',
  '/api/cases/open', '/api/cases/open-granted', '/api/cases/purchase',
  '/api/shop/offers/purchase', '/api/live-content/shop/buy',
  '/api/battle-pass/purchase-tier', '/api/battle-pass/purchase-level'
]) assert(maintenance.includes(`"${endpoint}"`), `recovery-aware endpoint missing: ${endpoint}`);
assert(!maintenance.includes('settings.purchasesDisabled && ["/api/rewards/create"'), 'recovery-aware purchases are still blocked before reconciliation');
assert(!maintenance.includes('/api/skins/bonus-case"].includes(path)'), 'bonus-case delivery must not be blocked as a new purchase');
assert(!maintenance.includes('settings.purchasesDisabled && ["/api/battle-pass/purchase-tier"'), 'battle-pass purchase is still blocked before reconciliation');

const skin = section(worker, 'async function purchaseSkinWithStock', '\nfunction liveContentOwnedStateKey');
assertOrder(skin, 'ensured.state.ownedSkins.includes(skinId)', 'requirePlayerOperationAvailable', 'skin purchase');
assert(skin.includes('assertOperationQuotedPrice(body, price'), 'skin purchase does not compare visible price');
assert(skin.includes('legacyCompatible:false'), 'skin purchase still allows an unquoted legacy price');
assert(skin.includes('operationSuccessMeta(operationId,"skin_purchase"'), 'skin purchase has no operation completion metadata');

const live = section(worker, 'async function purchaseLiveContentShopItem', '\nasync function getSkinConfig');
assertOrder(live, '(ensured.state?.[ownedKey]||[]).includes(itemId)', 'requirePlayerOperationAvailable', 'live-content purchase');
assert(live.includes('assertOperationQuotedPrice(body,price'), 'live-content purchase does not compare visible price');
assert(live.includes('legacyCompatible:false'), 'live-content purchase still allows an unquoted legacy price');
assert(live.includes('operationSuccessMeta(operationId,"live_content_purchase"'), 'live-content purchase has no operation completion metadata');

const physical = section(worker, 'async function createReward', '\nasync function listMyRewards');
assertOrder(physical, 'if (existing)', 'requirePlayerOperationAvailable', 'physical reward purchase');
assert(physical.includes('assertOperationQuotedPrice(body,price'), 'physical reward purchase does not compare visible price');
assert(physical.includes('legacyCompatible:false'), 'physical purchase still allows an unquoted legacy price');
assert(physical.includes('operationSuccessMeta(requestId,"physical_purchase"'), 'physical purchase has no operation completion metadata');

const levelCase = section(worker, 'async function openLevelCase', '\nasync function purchaseCaseFromShop');
assertOrder(levelCase, 'if(existing)', 'requirePlayerOperationAvailable', 'level case opening');
assert(levelCase.includes('operationSuccessMeta(`level:${requestedLevel}`,"level_case_open",false)'), 'fresh level case has no completion metadata');
assert(levelCase.includes('CASE_STATE_COMMIT_MAX_ATTEMPTS'), 'level case opening has no bounded revision retry');
assert(levelCase.includes('caseStateRevisionGuardStatement'), 'level case opening has no explicit revision guard');
assert(levelCase.includes('{ explicitRevisionGuard:true }'), 'level case opening still uses the legacy booster CHECK as a revision guard');
assert(levelCase.includes('if (attempt < CASE_STATE_COMMIT_MAX_ATTEMPTS) continue;'), 'level case state conflict is not retried server-side');

const casePurchase = section(worker, 'async function purchaseCaseFromShop', '\nconst GRANTED_CASE_OPENING_STALE_SECONDS');
assertOrder(casePurchase, 'if (existing)', 'requirePlayerOperationAvailable', 'case purchase');
assert(casePurchase.includes('legacyCode:"CASE_PRICE_CHANGED"'), 'case price-change compatibility code is missing');
assert(casePurchase.includes('operationSuccessMeta(requestId,"case_purchase"'), 'case purchase has no operation completion metadata');

const grantedCase = section(worker, 'async function openGrantedCase', '\nasync function grantAdminCaseOrFrame');
assertOrder(grantedCase, 'grantedCaseExistingRequestPayload', 'requirePlayerOperationAvailable', 'granted case opening');
assert(grantedCase.includes('kind:"granted_case_open",state:"processing"'), 'granted case pending operation state is missing');
assert(grantedCase.includes('operationSuccessMeta(requestId || openingClaimToken,"granted_case_open",false)'), 'fresh granted case has no completion metadata');
assert(grantedCase.includes('CASE_STATE_COMMIT_MAX_ATTEMPTS'), 'granted case opening has no bounded revision retry');
assert(grantedCase.includes('caseStateRevisionGuardStatement'), 'granted case opening has no explicit revision guard');
assert(grantedCase.includes('{ explicitRevisionGuard:true }'), 'granted case opening still uses the legacy booster CHECK as a revision guard');

const flash = section(worker, 'async function purchaseFlashOffer', '\nasync function ownerPanelFlashOffers');
assertOrder(flash, 'existing?.status==="completed"', 'requirePlayerOperationAvailable', 'flash-offer purchase');
assert(flash.includes('if(!resuming)assertOperationQuotedPrice'), 'flash-offer quote validation must apply only to new requests');
assert(flash.includes('legacyCompatible:false'), 'flash offer still allows an unquoted legacy price');
assert(flash.includes('if(!resuming&&physicalCount)'), 'flash-offer physical gate does not preserve reserved recovery');
assert(flash.includes('if(!resuming&&caseCount)'), 'flash-offer case gate does not preserve reserved recovery');
assert(flash.includes('TEMPORARILY_UNAVAILABLE'), 'flash-offer unknown result is not retry-safe');

const tierPurchase = section(worker, 'async function purchaseSeasonPassTier', '\nasync function purchaseSeasonPassLevel');
assertOrder(tierPurchase, "String(existing?.status)==='delivered'", 'requirePlayerOperationAvailable', 'season-pass tier purchase');
assert(tierPurchase.includes('allowBlockedRecovery:true'), 'season-pass tier cannot inspect committed state while pass is closed');
assert(tierPurchase.includes('assertOperationQuotedPrice(ctx.body,price'), 'season-pass tier does not compare visible price');
assert(tierPurchase.includes('legacyCompatible:false'), 'season-pass tier still allows an unquoted legacy price');
assert(tierPurchase.includes("operationSuccessMeta(operationId,'season_pass_tier_purchase'"), 'season-pass tier has no operation completion metadata');

const levelPurchase = section(worker, 'async function purchaseSeasonPassLevel', '\nasync function recordSeasonPassRunActivity');
assertOrder(levelPurchase, 'if(targetLevel<=currentLevel)', 'requirePlayerOperationAvailable', 'season-pass level purchase');
assert(levelPurchase.includes('allowBlockedRecovery:true'), 'season-pass level cannot inspect committed state while pass is closed');
assert(levelPurchase.includes("operationCode:'PRICE_CHANGED'"), 'season-pass level price change has no stable code');
assert(levelPurchase.includes("operationSuccessMeta(operationId,'season_pass_level_purchase'"), 'season-pass level has no operation completion metadata');

const seasonContext = section(worker, 'async function seasonPassRequestContext', '\nfunction seasonPassMoscowPeriod');
assert(seasonContext.includes('allowBlockedRecovery'), 'season-pass request context lacks blocked-state recovery mode');

for (const route of ['/api/shop/offers/purchase', '/api/live-content/shop/buy', '/api/skins/purchase', '/api/rewards/create']) {
  const pos = worker.indexOf(`url.pathname === "${route}"`);
  assert(pos >= 0, `route missing: ${route}`);
  const routeBlock = pos >= 0 ? worker.slice(pos, worker.indexOf('\n      }', pos) + 8) : '';
  assert(!routeBlock.includes('enforceFeatureFlagForRequest'), `route ${route} still blocks recovery before handler`);
}

const caseStateRefresh = section(worker, 'async function getLevelCaseState', '\n// A level is the natural idempotency key');
assert(!caseStateRefresh.includes('processPlayerRewardDeliveryQueue'), 'case recovery/state refresh still mutates reward delivery state');
assert(caseStateRefresh.includes('body.recovery === true ? {} : (body.current || {})'), 'case recovery still applies client profile state while checking an opening');
const caseStateWriter = section(worker, 'function caseStateUpdateStatement', '\nasync function ensureCasePlayerState');
assert(caseStateWriter.includes('explicitRevisionGuard'), 'case state writer has no explicit revision-guard mode');
assert(caseStateWriter.includes('active_booster_runs = ?,'), 'explicit case-state update still has no normal legacy-booster write');
assert(worker.includes('CONSTRAINT case_state_revision_guard_ok CHECK(ok=1)'), 'runtime case-state revision guard schema is missing');

assert(index.includes('async function operationApiRequest'), 'client shared operation request helper is missing');
assert(index.includes('error?.operationCode || error?.code || error?.details?.operationCode'), 'case UI does not recognize normalized STATE_CONFLICT');
assert(index.includes('error?.operationCode === &quot;STATE_CONFLICT&quot;'), 'granted-case retry logic ignores normalized STATE_CONFLICT');
assert(index.includes('return loadCaseState(true, false, true);'), 'case opening recovery does not request a read-only state check');
assert(index.includes('operationContractVersion: 1'), 'client does not send operation contract version');
assert(index.includes('function operationIssuePresentation'), 'client shared friendly operation state presenter is missing');
assert(index.includes('Покупки временно недоступны'), 'client friendly purchases-disabled message is missing');
assert(index.includes('Кейсы временно недоступны'), 'client friendly cases-disabled message is missing');
assert(index.includes('purchase.requestId = purchase.requestId || makeRewardRequestId();'), 'client does not preserve a request id for purchase confirmation');
assert(index.includes('skinId: skin.id,\n          requestId: purchase.requestId,\n          expectedPrice:'), 'skin request is missing stable id or visible quote');
assert(index.includes('button.dataset.operationRequestId'), 'live-content request id is not preserved after an unknown response');
assert(index.includes('offerId:offer.id, requestId, current:playerProfileSnapshot(), expectedPrice:'), 'flash-offer request is missing visible quote');
assert(index.includes('productId: purchase.id,\n          requestId,\n          gameVersion: GAME_VERSION,\n          expectedPrice:'), 'physical reward request is missing visible quote');

assert(battlePass.includes('apiError.operationCode = String('), 'battle-pass API does not preserve operation codes');
assert(battlePass.includes('let pendingPurchaseExpectedPrice = null;'), 'battle-pass tier does not remember the visible quote');
assert(battlePass.includes('operationContractVersion:1,\n        tier,\n        expectedPrice:'), 'battle-pass tier does not send the visible quote');
assert(battlePass.includes('operationContractVersion:1,\n        targetLevel:target,'), 'battle-pass level purchase does not use the operation contract');
assert(battlePass.includes('operationCode === "FEATURE_TEMPORARILY_DISABLED"'), 'battle-pass client does not show disabled-purchase state');
assert(battlePass.includes('operationCode === "PRICE_CHANGED"'), 'battle-pass client does not require a new confirmation after price change');
assert(battlePass.includes('activatePremiumTier(tier, expectedPrice)'), 'battle-pass confirmation does not pass the displayed quote');

// Consumable boosters use two server-authoritative slots: one reward booster and
// one run-helper booster. Same-group alternatives remain inspectable in the UI
// so the player gets an explanation instead of a silent disabled control.
assert(worker.includes('const CASE_UTILITY_BOOSTER_TYPES = Object.freeze(["shield", "second_chance", "pause"]);'), 'utility booster group catalog is missing');
assert(worker.includes('function caseBoosterGroupForType(rawType)'), 'server booster group resolver is missing');
assert(worker.includes('function caseActiveBoosterConflict(value, rawType)'), 'server booster group conflict resolver is missing');
const boosterActivation = section(worker, 'async function activateCaseBooster(request, env)', '\nasync function consumeCaseBoosterRun');
assert(boosterActivation.includes('const conflictType=caseActiveBoosterConflict(state.activeBoosters,boosterType);'), 'real booster activation does not enforce same-group exclusivity');
assert(boosterActivation.includes('code:"BOOSTER_GROUP_CONFLICT"'), 'real booster conflict does not expose a stable error code');
assert(worker.includes('if(path==="/api/cases/activate")'), 'test-project booster activation route is missing');
assert(worker.includes('const conflictType=caseActiveBoosterConflict(active,type);if(conflictType)'), 'test-project booster activation does not mirror production group rules');
assert(index.includes('const CASE_UTILITY_BOOSTER_TYPES = Object.freeze([&quot;shield&quot;, &quot;second_chance&quot;, &quot;pause&quot;]);'), 'client utility booster group catalog is missing');
assert(index.includes('function activeCaseBoosterConflict(rawType, value = state.activeCaseBoosters)'), 'client booster conflict resolver is missing');
assert(index.includes('data-booster-conflict='), 'same-group booster card is not tappable for conflict explanation');
assert(index.includes('class=&quot;zpi-booster-conflict&quot;'), 'booster conflict popup is missing');
assert(index.includes('Одновременно может быть активен только один усилитель из группы'), 'booster conflict popup does not explain the one-per-group rule');
assert(index.includes('Один усилитель из каждой группы'), 'booster tutorial does not teach the two-slot rule');
assert(index.includes('Открой «Мои покупки» → «Усилители».'), 'booster tutorial does not use the current My Purchases terminology');
assert(index.includes('Мои покупки&lt;/strong&gt;'), 'player warehouse heading was not renamed to My Purchases');
assert(index.includes('aria-label=&quot;Разделы «Моих покупок»&quot;'), 'My Purchases tab group still exposes legacy warehouse wording');
assert(index.includes('&quot;finishStock&quot;:&quot;Открыть «Мои покупки»&quot;'), 'tutorial destination CTA still uses legacy warehouse wording');
assert(!index.includes('Разные типы работают одновременно. Второй такой же тип нельзя активировать'), 'legacy unlimited cross-type booster rule is still present');
assert(!index.includes('&quot;title&quot;:&quot;Склад&quot;'), 'tutorial catalog still presents a player-facing Warehouse title');
for (const [name, source] of playerUis) {
  const legacyWarehouseNoun = new RegExp('(^|[^\\p{L}])склад(?:а|е|ом|у|ы|ов)?(?=$|[^\\p{L}])', 'iu');
  assert(!legacyWarehouseNoun.test(source), `${name}: player-facing legacy «Склад» terminology is still present`);
}

const boosterHelperSource = [
  'const CASE_REWARD_BOOSTER_TYPES = Object.freeze(["points", "treats", "coffee"]);',
  'const CASE_UTILITY_BOOSTER_TYPES = Object.freeze(["shield", "second_chance", "pause"]);',
  'const CASE_BOOSTER_TYPES = Object.freeze([...CASE_REWARD_BOOSTER_TYPES, ...CASE_UTILITY_BOOSTER_TYPES]);',
  'const CASE_BOOSTER_RUNS = Object.freeze({ points:2, treats:2, coffee:2, shield:1, second_chance:1, pause:1 });',
  'function safeAdminNumber(value){ const number=Number(value); return Number.isFinite(number)?Math.max(0,Math.min(999999999,Math.floor(number))):0; }',
  extractNamedFunction(worker, 'caseBoosterRunsForType'),
  extractNamedFunction(worker, 'caseBoosterGroupForType'),
  extractNamedFunction(worker, 'caseNormalizeActiveBoosters'),
  extractNamedFunction(worker, 'caseActiveBoosterConflict'),
  'return { caseBoosterGroupForType, caseActiveBoosterConflict };'
].join('\n');
const boosterHelpers = new Function(boosterHelperSource)();
assert(boosterHelpers.caseBoosterGroupForType('coffee') === 'reward', 'coffee is not classified as a reward booster');
assert(boosterHelpers.caseBoosterGroupForType('shield') === 'utility', 'shield is not classified as a run helper');
assert(boosterHelpers.caseActiveBoosterConflict({coffee:2}, 'treats') === 'coffee', 'reward booster does not block another reward booster');
assert(boosterHelpers.caseActiveBoosterConflict({shield:1}, 'pause') === 'shield', 'run helper does not block another run helper');
assert(boosterHelpers.caseActiveBoosterConflict({coffee:2}, 'shield') === '', 'different booster groups incorrectly block each other');

// FullScreen run HUD must surface reward x2 state without relying on the legacy
// bottom pill, and the settled result must state how many boosted runs remain.
assert(index.includes('data-run-focus-booster'), 'fullscreen x2 booster HUD slot is missing');
assert(index.includes('function runBoosterRemainingLabel(type)'), 'fullscreen x2 remaining-run label helper is missing');
assert(index.includes('function runResultsBoosterStatusMarkup(settlement)'), 'run result booster continuation status is missing');
assert(index.includes('const boosterStatusMarkup = runResultsBoosterStatusMarkup(settlement);'), 'settled run does not compute booster continuation status');
assert(index.includes('${boosterStatusMarkup}'), 'settled run does not render booster continuation status');
assert(index.includes('#zefirok-maltipoo-runner.is-game-expanded .run-booster-pill{display:none!important}'), 'legacy bottom booster pill is still visible in fullscreen');
assert(index.includes('if (lastTwo &gt;= 11 &amp;&amp; lastTwo &lt;= 14) return &quot;забегов&quot;;'), 'booster run pluralization is not Russian-safe for 11-14');
assert(index.includes('renderActiveRunBooster();\n        if (state.paused &amp;&amp; overlay.classList.contains'), 'fullscreen toggle does not refresh booster HUD immediately');

// Pause must never leave the run frozen behind an invisible overlay. A minimal
// modal is rendered first and remains as a fallback if the rich pause card throws.
assert(index.includes('function renderPauseModalFallback(reason = &quot;manual&quot;)'), 'pause fallback renderer is missing');
assert(index.includes('renderPauseModalFallback(reason);\n        try {'), 'pause modal is not rendered before risky rich UI work');
assert(index.includes('const character = runCharacterProfile(skinId);'), 'rich pause modal lost its character profile initialization');
assert(index.includes('pauseBtn.addEventListener(&quot;pointerup&quot;, activatePauseControl);'), 'main pause control does not handle pointerup');
assert(index.includes('focusPauseBtn?.addEventListener(&quot;pointerup&quot;'), 'fullscreen pause control does not handle pointerup');
assert(index.includes('const blockingOverlayVisible = overlay &amp;&amp; overlay.style.display !== &quot;none&quot;'), 'pause is still blocked by stale hidden overlay classes');

// First-run gameplay onboarding is action-driven rather than a passive slide deck.
// It may create temporary obstacle/pickup visuals, but those practice objects must
// never spend boosters, end the run, or grant score/resources.
assert(index.includes('id=&quot;zefirok-gameplay-coach-v1&quot;'), 'interactive gameplay coach stylesheet is missing');
assert(index.includes('data-gameplay-coach'), 'interactive gameplay coach layer is missing');
assert(index.includes('const GAMEPLAY_COACH_COPY = Object.freeze({'), 'interactive gameplay coach copy/state machine is missing');
assert(index.includes('title:&quot;Играй на весь экран&quot;'), 'gameplay coach does not teach fullscreen first');
assert(index.includes('title:&quot;Сделай прыжок&quot;'), 'gameplay coach does not teach a real jump');
assert(index.includes('title:&quot;Перепрыгни препятствие&quot;'), 'gameplay coach does not require a training obstacle');
assert(index.includes('title:&quot;Собирай награды&quot;'), 'gameplay coach does not teach pickups');
assert(index.includes('function openGameplayCoach(automatic = false, startIndex = 0)'), 'gameplay coach launcher is missing');
assert(index.includes('if (openGameplayCoach(automatic, startIndex)) return;'), 'main How to Play entry does not launch the interactive coach');
assert(index.includes('tutorialCoach:true, tutorialCoachPassed:false'), 'safe tutorial obstacle is missing');
assert(index.includes('gameplayCoachRetryObstacle(item);\n          return false;'), 'tutorial obstacle collision can still fall through to normal death/booster handling');
assert(index.includes('if (!state.running || state.rafId || gameplayCoachFrozen) return;'), 'tutorial freeze does not stop the game loop');
assert(index.includes('Этот учебный зефир ничего не начисляет.'), 'tutorial pickup does not explain its practice-only reward behavior');
const tutorialPickupBranch = section(index, 'if (item.tutorialCoach) {', '} else {\n                if (item.kind === &quot;coffee&quot;)');
assert(!tutorialPickupBranch.includes('state.runTreats += 1'), 'tutorial pickup grants real treats');
assert(!tutorialPickupBranch.includes('state.runCoffee += 1'), 'tutorial pickup grants real coffee');
assert(!tutorialPickupBranch.includes('state.score += 35'), 'tutorial pickup grants real score');
assert(index.includes('gameplayCoachSkipBtn?.addEventListener'), 'gameplay coach cannot be skipped');
assert(index.includes('gameplayCoachActionBtn?.addEventListener'), 'gameplay coach completion cannot resume the run');

// Delivery monitoring must separate terminal application failures from Telegram
// recipients who permanently blocked/deactivated the bot, and reward retries must
// not become a red critical signal until their retry budget is exhausted.
assert(worker.includes('function telegramDeliveryErrorTextIsPermanent(value)'), 'permanent Telegram delivery classifier is missing');
assert(worker.includes('function telegramPermanentDeliverySql(columnName)'), 'permanent Telegram SQL classifier is missing');
assert(worker.includes('Недоступных Telegram-чатов: <b>${unreachableChats}</b>'), 'daily report does not separate unreachable Telegram chats');
assert(worker.includes("status='failed' AND attempts>=5"), 'terminal reward delivery failures are not gated by exhausted attempts');
assert(worker.includes("status='failed' AND attempts<5"), 'retrying reward deliveries are not tracked separately');
assert(worker.includes("UPDATE bot_subscribers SET active=0,last_error=?"), 'permanent Telegram failures do not deactivate dead subscriber routes');
const telegramDeliveryHelperSource = [
  extractNamedFunction(worker, 'telegramDeliveryErrorTextIsPermanent'),
  'return { telegramDeliveryErrorTextIsPermanent };'
].join('\n');
const telegramDeliveryHelpers = new Function(telegramDeliveryHelperSource)();
assert(telegramDeliveryHelpers.telegramDeliveryErrorTextIsPermanent('Forbidden: bot was blocked by the user'), 'blocked bot is not classified as permanent delivery failure');
assert(telegramDeliveryHelpers.telegramDeliveryErrorTextIsPermanent('Bad Request: chat not found'), 'missing Telegram chat is not classified as permanent delivery failure');
assert(!telegramDeliveryHelpers.telegramDeliveryErrorTextIsPermanent('Too Many Requests: retry after 5'), 'retryable Telegram rate limit is incorrectly classified as permanent');

// Generated asset manifests must be byte-stable across macOS (NFD filenames)
// and Linux (NFC filenames), otherwise GitHub Actions reports a false dirty diff.
assert(assetCheck.includes("normalize('NFC')"), 'asset manifest paths are not Unicode NFC-normalized');
assert(assetCheck.includes('function compareCanonicalAssetNames'), 'asset manifest sort is not platform-stable');
assert(assetCheck.includes('function canonicalAssetPath'), 'asset manifest paths are not canonicalized');
assert(assetCheck.includes("a.localeCompare(b, 'ru')"), 'asset manifest ordering no longer preserves the established Russian sort');
assert(assetManifestCheck.includes('resolveCanonicalAssetAbsolute'), 'content-hash verifier cannot resolve NFC/NFD-equivalent filesystem paths');
assert(assetManifestCheck.includes("entry.normalize('NFC')===canonical"), 'content-hash verifier does not compare Unicode-normalized path components');

// Losing first place is a server-authoritative, delayed Telegram event. The
// queued message is materialized immediately before delivery so stale leaders
// are cancelled and rapid leader changes collapse into one current notice.
assert(worker.includes('const LEADERBOARD_DETHRONE_NOTIFICATION_PREFIX="rating_dethroned:";'), 'rating dethrone notification category is missing');
assert(worker.includes('const LEADERBOARD_DETHRONE_DELAY_SECONDS=90;'), 'rating dethrone notification is not debounced');
assert(worker.includes('const LEADERBOARD_DETHRONE_COOLDOWN_SECONDS=3600;'), 'rating dethrone notification cooldown is missing');
assert(worker.includes('async function queueLeaderboardDethroneNotificationIfNeeded'), 'rating dethrone enqueue helper is missing');
assert(worker.includes('async function materializeLeaderboardDethroneNotification'), 'rating dethrone send-time revalidation is missing');
assert(worker.includes('previousSeasonLeader] = await Promise.all(['), 'run settlement does not capture the previous visible leader');
assert(worker.includes('ORDER BY best_score DESC,achieved_at ASC,telegram_id ASC LIMIT 1'), 'rating dethrone logic does not use leaderboard tie-break ordering');
assert(worker.includes('scheduleRunSettlementBackground(executionCtx, queueLeaderboardDethroneNotificationIfNeeded'), 'leader change is not queued after authoritative settlement');
assert(worker.includes('if(String(leader.telegram_id||"")===telegramId)return {action:"cancel",reason:"rating-lead-restored"};'), 'rating notice is not cancelled after the old leader retakes first place');
assert(worker.includes("status IN ('pending','failed') AND attempts<5"), 'rating dethrone debounce does not reuse a pending queue item');
assert(worker.includes('🏃 Вернуть первое место'), 'rating dethrone Telegram CTA is missing');
assert(worker.includes('Корона сменила владельца!'), 'rating dethrone Telegram copy is missing');
assert(worker.includes('if(isLeaderboardDethroneNotificationCategory(row.category)){'), 'notification queue does not revalidate rating notices before delivery');

const dethroneHelperSource = [
  'const LEADERBOARD_DETHRONE_NOTIFICATION_PREFIX="rating_dethroned:";',
  extractNamedFunction(worker, 'leaderboardDethroneSeasonId'),
  extractNamedFunction(worker, 'leaderboardDethronePointsWord'),
  'return { leaderboardDethroneSeasonId, leaderboardDethronePointsWord };'
].join('\n');
const dethroneHelpers = new Function(dethroneHelperSource)();
assert(dethroneHelpers.leaderboardDethroneSeasonId('rating_dethroned:s2') === 's2', 'rating notification season parser is broken');
assert(dethroneHelpers.leaderboardDethronePointsWord(1) === 'очко', 'rating gap plural: 1');
assert(dethroneHelpers.leaderboardDethronePointsWord(2) === 'очка', 'rating gap plural: 2');
assert(dethroneHelpers.leaderboardDethronePointsWord(5) === 'очков', 'rating gap plural: 5');
assert(dethroneHelpers.leaderboardDethronePointsWord(11) === 'очков', 'rating gap plural: 11');
assert(dethroneHelpers.leaderboardDethronePointsWord(21) === 'очко', 'rating gap plural: 21');

// P2 operational retention must archive before pruning detail and keep semantic
// identities required by lifetime achievements / reward idempotency.
assert(worker.includes('const OPERATIONAL_RETENTION_POLICIES = Object.freeze({'), 'operational retention policy catalog is missing');
for (const policy of ['game_run_sessions','game_run_live_proofs','player_economy_run_ledger','admin_performance_samples','admin_performance_hourly_archive','server_analytics_hourly','content_analytics_events','player_timeline_events','player_notification_log','player_notification_queue','leaderboard_staff_notifications','reward_delivery_queue']) {
  assert(worker.includes(`key:"${policy}"`), `retention policy missing: ${policy}`);
}
const retention = section(worker, 'async function processOperationalRetention', '\nasync function cancelStaleSeasonEndReminderQueues');
for (const archive of ['game_run_session_daily_archive','game_run_proof_daily_archive','player_economy_run_daily_archive','player_economy_run_fact_archive','admin_performance_hourly_archive','admin_performance_daily_archive','server_analytics_daily_archive','content_analytics_daily_archive','player_timeline_daily_archive','notification_delivery_daily_archive','reward_delivery_archive']) {
  assert(worker.includes(archive), `retention archive is not referenced: ${archive}`);
}
assert(retention.includes('runOperationalRetentionPolicy'), 'retention jobs are not wrapped by policy state tracking');
assert(worker.includes("status IN ('finished','expired','superseded')"), 'run-session retention could prune non-terminal sessions');
assert(worker.includes('ledger retention paused: LEADERBOARD_MIN_RUN_SECONDS='), 'ledger retention does not fail safe when the qualification threshold changes');
assert(worker.includes('FROM player_economy_run_fact_archive WHERE telegram_id=? AND qualification_ms=? AND qualified=1'), 'lifetime achievements do not read compacted run facts');
assert(worker.includes('SELECT 1 AS archived FROM reward_delivery_archive WHERE operation_id=? LIMIT 1'), 'reward enqueue does not consult compact idempotency archive');
const dailyCleanup = section(worker, 'async function processDailyServerCleanup', '\nasync function executeServerCronJob');
for (const table of ['admin_performance_samples','server_analytics_hourly','game_run_sessions','game_run_live_proofs','player_economy_run_ledger','content_analytics_events','player_timeline_events','player_notification_log','player_notification_queue','leaderboard_staff_notifications','reward_delivery_queue']) {
  assert(!dailyCleanup.includes(`DELETE FROM ${table}`), `daily cleanup bypasses archive retention for ${table}`);
}
assert(worker.includes('["retention", () => processOperationalRetention(env)]'), 'hourly maintenance does not run bounded retention');
assert(worker.includes('retention:(retention.results||[]).map'), 'Control Center system API does not expose retention state');
assert(!worker.includes('DELETE FROM player_notification_log WHERE sent_at<?'), 'notification log still has a direct delete path outside retention');
assert(worker.includes("(status IN ('sent','cancelled') OR (status='failed' AND attempts>=5))"), 'player notification retention can remove retryable failed deliveries');
assert(worker.includes("(status IN ('delivered','claimed','cancelled') OR (status='failed' AND attempts>=5))"), 'reward retention can remove retryable failed deliveries');

// Execute the actual Worker quote helpers in isolation. This keeps the build test
// behavioral without importing or booting the production Worker.
const helperSource = [
  'const PLAYER_OPERATION_CONTRACT_VERSION = 1;',
  'class ApiError extends Error { constructor(status,message,details=undefined){ super(message); this.status=status; this.details=details; } }',
  'function safeAdminNumber(value){ const number=Number(value); return Number.isFinite(number)?Math.max(0,Math.min(999999999,Math.floor(number))):0; }',
  extractNamedFunction(worker, 'normalizePlayerOperationCode'),
  extractNamedFunction(worker, 'playerOperationError'),
  extractNamedFunction(worker, 'normalizeOperationPrice'),
  extractNamedFunction(worker, 'assertOperationQuotedPrice'),
  'return { normalizePlayerOperationCode, assertOperationQuotedPrice };'
].join('\n');
const helpers = new Function(helperSource)();
assert(helpers.normalizePlayerOperationCode('CASE_PRICE_CHANGED') === 'PRICE_CHANGED', 'legacy case price code is not normalized');
assert(helpers.normalizePlayerOperationCode('CASE_STATE_CONFLICT') === 'STATE_CONFLICT', 'legacy case conflict code is not normalized');
assert(helpers.normalizePlayerOperationCode('CASE_SCHEMA_UNAVAILABLE') === 'TEMPORARILY_UNAVAILABLE', 'legacy case schema code is not normalized');
let thrown = null;
try { helpers.assertOperationQuotedPrice({operationContractVersion:1,expectedPrice:{points:10,treats:2,coffee:1}},{points:11,treats:2,coffee:1},{operationId:'t1',operationKind:'test'}); } catch (error) { thrown = error; }
assert(thrown?.details?.operationCode === 'PRICE_CHANGED', 'changed quote does not produce PRICE_CHANGED');
assert(thrown?.details?.currentPrice?.points === 11, 'changed quote does not return authoritative price');
thrown = null;
try { helpers.assertOperationQuotedPrice({operationContractVersion:1},{points:11,treats:2,coffee:1},{operationId:'t2',operationKind:'test'}); } catch (error) { thrown = error; }
assert(thrown?.details?.operationCode === 'PRICE_CHANGED', 'contract v1 cannot silently buy without a quote');
thrown = null;
try { helpers.assertOperationQuotedPrice({operationContractVersion:1,expectedPrice:{points:11,treats:2,coffee:1}},{points:11,treats:2,coffee:1},{operationId:'t3',operationKind:'test'}); } catch (error) { thrown = error; }
assert(thrown === null, 'matching quote is incorrectly rejected');
thrown = null;
try { helpers.assertOperationQuotedPrice({}, {points:11,treats:2,coffee:1}, {legacyCompatible:true}); } catch (error) { thrown = error; }
assert(thrown === null, 'legacy client compatibility was broken unexpectedly');
thrown = null;
try { helpers.assertOperationQuotedPrice({}, {points:11,treats:2,coffee:1}, {legacyCompatible:false}); } catch (error) { thrown = error; }
assert(thrown?.details?.operationCode === 'PRICE_CHANGED', 'strict operation accepted a missing quote');

if (process.exitCode) process.exit(process.exitCode);
console.log(`Operation system checks passed: ${checks}`);
