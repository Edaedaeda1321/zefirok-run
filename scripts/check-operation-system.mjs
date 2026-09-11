import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workerPath = path.join(root, 'src', 'worker.js');
const indexPath = path.join(root, 'index.html');
const battlePassPath = path.join(root, 'battle-pass.html');
const worker = fs.readFileSync(workerPath, 'utf8');
const index = fs.readFileSync(indexPath, 'utf8');
const battlePass = fs.readFileSync(battlePassPath, 'utf8');

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
