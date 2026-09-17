#!/usr/bin/env node
import fs from 'node:fs';

const indexRaw = fs.readFileSync('index.html','utf8');
const decodeSrcdoc=(text)=>String(text)
  .replace(/&quot;/g,'\"')
  .replace(/&#x27;|&#39;/g,"'")
  .replace(/&lt;/g,'<')
  .replace(/&gt;/g,'>')
  .replace(/&amp;/g,'&');
const index = decodeSrcdoc(indexRaw);
const worker = fs.readFileSync('src/worker.js','utf8');
const gate = fs.readFileSync('scripts/check-production-gate.mjs','utf8');
let checks=0;
const assert=(condition,message)=>{checks+=1;if(!condition)throw new Error(`Case stability check failed: ${message}`);};
const between=(text,start,end)=>{const a=text.indexOf(start);assert(a>=0,`missing ${start}`);const b=text.indexOf(end,a+start.length);assert(b>a,`missing end ${end}`);return text.slice(a,b);};
const occurrences=(text,needle)=>text.split(needle).length-1;

assert(index.includes('const CASE_API_OPEN_GRANTED_STATUS_PATH = "/api/cases/open-granted/status";'),'client status path missing');
assert(index.includes('const GRANTED_CASE_PENDING_TTL_MS = 15 * 60 * 1000;'),'durable operation TTL missing');
assert(index.includes('const GRANTED_CASE_OPEN_REQUEST_TIMEOUT_MS = 5000;'),'gifted case mutation timeout must stay bounded');
assert(index.includes('const GRANTED_CASE_STATUS_REQUEST_TIMEOUT_MS = 2200;'),'case observer timeout must stay fast');
assert(index.includes('updateCaseOpeningPreviewStatus("Проверяем результат…"'),'slow case UI does not transition to recovery status');
assert(index.includes('restoreGrantedCasePendingRequests();'),'pending operation restore missing');
assert(index.includes('rememberGrantedCasePendingRequest(type, requestId'),'pending operation persistence missing');
assert(index.includes('Array.isArray(data?.giftedCaseOpenings)'),'server opening recovery is not consumed by client');
assert(index.includes('for (const [type, requestId] of grantedCasePendingRequests.entries())'),'committed receipt cannot stay discoverable after reload');

const wait = between(index,'async function waitForGrantedCaseResult','async function openGiftedCaseClient');
assert(wait.includes('grantedCaseStatusPath(caseType)'),'poll loop does not use the type-aware read-only status endpoint');
assert(occurrences(wait,'grantedCaseOpenPath(caseType)')===1,'poll loop may invoke mutation more than once');
assert(wait.includes('requestId: activeRequestId, resume: true'),'mutation retry is not an explicit adopted/same-request resume');
assert(!wait.includes('CASE_API_OPEN_GRANTED_PATH,\n              { caseType: String(caseType || ""), requestId },'),'poll loop still retries bare generic mutation endpoint');

const clientOpen = between(index,'async function openGiftedCaseClient','async function activateCaseBoosterClient');
assert(clientOpen.includes('const existingOperation = Boolean('),'existing opening detection missing');
assert(clientOpen.includes('data = await waitForGrantedCaseResult(type, requestId, deadline);'),'restored operation does not check status first');
assert(clientOpen.includes('forgetGrantedCasePendingRequest(type, requestId);'),'successful opening does not clear durable receipt');

const lease=Number(worker.match(/const GRANTED_CASE_RETRY_LEASE_SECONDS = (\d+);/)?.[1]||0);
const stale=Number(worker.match(/const GRANTED_CASE_OPENING_STALE_SECONDS = (\d+);/)?.[1]||0);
const uiDeadline=Number(index.match(/const GRANTED_CASE_OPEN_UI_DEADLINE_MS = (\d+);/)?.[1]||0);
assert(lease>=15,'same-request lease is shorter than 15 seconds');
assert(stale>=60,'generic orphan cleanup is shorter than 60 seconds');
assert(stale>=lease+30,'generic orphan cleanup can race explicit same-request recovery');
assert(uiDeadline>=8000&&uiDeadline<=20000,'client foreground recovery window must stay bounded between 8 and 20 seconds');
assert(lease*1000>=uiDeadline+5000,'server lease must outlive the client foreground window by at least 5 seconds');

assert(worker.includes('async function getGrantedCaseOpenStatus(request,env)'),'read-only granted case status handler missing');
const statusHandler=between(worker,'async function getGrantedCaseOpenStatus','const ORDINARY_CASE_FAST_STALE_SECONDS');
assert(statusHandler.includes("state:'opened'"),'status handler cannot return immutable opened receipt');
assert(statusHandler.includes("state:'opening'"),'status handler cannot report active operation');
assert(statusHandler.includes("state:'stale'"),'status handler cannot report safely resumable stale operation');
assert(statusHandler.includes("status='opening' AND opening_token<>''"),'status handler cannot adopt an orphaned same-type opening');
assert(statusHandler.includes('adopted:true'),'status handler does not mark adopted opening tokens');
assert(statusHandler.includes('requestedRequestId:requestId'),'status handler does not preserve the superseded client request id');
for(const forbidden of ['UPDATE granted_cases','INSERT INTO granted_cases','DELETE FROM granted_cases','recoverGrantedCaseRequestLease(','prepareCasePhysicalRewards(','rollLevelCase(','rollAlexCase(','caseStateUpdateStatement(']){
  assert(!statusHandler.includes(forbidden),`status handler mutates case operation via ${forbidden}`);
}

const route=between(worker,'if (url.pathname === "/api/cases/open-granted/status"','if (url.pathname === "/api/cases/purchase"');
assert(route.includes('return await getGrantedCaseOpenStatus(request, env);'),'status route does not call dedicated observer');
assert(!route.slice(0,route.indexOf('if (url.pathname === "/api/cases/open-granted"')).includes('withPlayerApiPerformance'),'status route is not storage-read-only because it is performance-sampled');

const existing=between(worker,'async function grantedCaseExistingRequestPayload','async function getGrantedCaseOpenStatus');
assert(existing.includes('options?.recoverStale===true'),'lease recovery is not explicit');
assert(!existing.includes('if(await recoverGrantedCaseRequestLease(env,telegramId,row,token))'),'old unconditional 12-second recovery path returned');

const opening=between(worker,'async function openGrantedCase','async function grantAdminCaseOrFrame');
assert(opening.includes('const resumeRequested = body.resume === true;'),'explicit resume flag missing');
assert(opening.includes('{ recoverStale:resumeRequested }'),'only explicit resume must recover same request');
assert(opening.includes("existing.status IN ('opening','opened')"),'atomic claim does not prevent the same requestId from consuming another grant');
assert(opening.includes("WHERE id=(\n         SELECT candidate.id"),'claim is not a single atomic candidate update');
assert(opening.includes("opening_token=? AND status='opening'"),'claimed grant is not re-read by durable request token');
assert(opening.includes('SELECT wallet,best_score,treats,coffee,profile_xp FROM admin_profile_state'),'committed opening does not use a tiny direct profile receipt');
assert(!opening.includes('const inventory = await readFastCaseInventory(env, telegramId);'),'committed opening still blocks on full inventory rebuild');
assert(opening.includes('background-fold'),'post-commit profile fold is not isolated in background');
const levelOpening=between(worker,'async function openLevelCase','async function purchaseCaseFromShop');
assert(levelOpening.includes('SELECT wallet,best_score,treats,coffee,profile_xp FROM admin_profile_state'),'level case committed receipt is not using a direct profile row');
assert(!levelOpening.includes('const inventory = await readFastCaseInventory(env, telegramId);'),'level case still blocks on inventory rebuild after commit');
assert(levelOpening.includes('background-fold'),'level case profile fold is not backgrounded');

const inventory=between(worker,'async function readFastCaseInventory','async function buildFastCasePurchasePayload');
assert(inventory.includes("status='opening' AND opening_token<>''"),'server state cannot recover an in-flight granted case after reload');
assert(inventory.includes('openingOperations'),'opening operation metadata missing from inventory');
const purchasePayload=between(worker,'async function buildFastCasePurchasePayload','async function buildFastCaseRefreshPayload');
const refreshPayload=between(worker,'async function buildFastCaseRefreshPayload','function buildFastCaseOpenPayload');
assert(occurrences(worker,'async function buildFastCasePurchasePayload')===1,'purchase payload builder was removed or duplicated');
assert(occurrences(worker,'async function buildFastCaseRefreshPayload')===1,'refresh payload builder was removed or duplicated');
assert(purchasePayload.includes('giftedCaseOpenings:inventory.openingOperations||[]'),'purchase payload does not expose active opening operations');
assert(refreshPayload.includes('giftedCaseOpenings:inventory.openingOperations||[]'),'fast refresh does not expose active opening operations');
assert(occurrences(worker,'giftedCaseOpenings:inventory.openingOperations||[]')===3,'opening metadata must be exposed by purchase, refresh and dedicated ordinary payloads');
assert(worker.includes('...(inventory?.openingOperations ? { giftedCaseOpenings: inventory.openingOperations } : {})'),'open payload does not expose active opening operations');

assert(worker.includes('"/api/cases/open-granted/status"'),'status path missing from worker');
const recoveryAware=between(worker,'const RECOVERY_AWARE_OPERATION_PATHS = new Set([',']);');
assert(recoveryAware.includes('/api/cases/open-granted/status'),'read-only status observer must bypass maintenance so a lost committed result remains recoverable');
assert(worker.includes('"/api/cases/open-ordinary/status","/api/cases/open-granted","/api/cases/open-granted/status","/api/cases/purchase"'),'Test Project does not isolate ordinary and generic case status paths');

// Data-plane isolation: opening a case must never bootstrap or migrate the
// owner/admin LiveOps control plane. Optional configuration reads are fail-soft.
assert(worker.includes('async function readCaseRuntimeConfig(env,force=false)'),'isolated player case runtime reader missing');
const caseRuntimeReader=between(worker,'async function readCaseRuntimeConfig','const LIVEOPS_CONFIG_CACHE_TTL_MS');
for(const forbidden of ['ensureLiveOpsAdminSchema(','ensureLiveContentReleaseSchema(','readLiveOpsConfig(','readLiveContentReleaseRules(','CREATE TABLE','ALTER TABLE','INSERT INTO','UPDATE ','DELETE FROM']){
  assert(!caseRuntimeReader.includes(forbidden),`case runtime reader touches control-plane mutation via ${forbidden}`);
}
assert(caseRuntimeReader.includes('case runtime content overrides unavailable; using evergreen defaults'),'content override failure is not fail-soft');
assert(caseRuntimeReader.includes('case runtime case config unavailable; using code defaults'),'case config failure is not fail-soft');
assert(caseRuntimeReader.includes('case runtime seasonal registry unavailable; future rewards disabled fail-closed'),'future content failure is not fail-closed');
assert(caseRuntimeReader.includes('SELECT item_kind,item_id,content_season_id,ever_released,status,release_at,routes_json'),'case runtime does not read release registry directly');

const fullCasePayload=between(worker,'async function buildCasePayload','async function readFastCaseInventory');
assert(fullCasePayload.includes('readCaseRuntimeConfig(env)'),'full case payload still depends on admin LiveOps reader');
assert(!fullCasePayload.includes('readLiveOpsConfig(env)'),'full case payload reintroduced control-plane LiveOps dependency');
assert(levelOpening.includes('readCaseRuntimeConfig(env)'),'level opening does not use isolated case config');
assert(levelOpening.includes('rollLevelCaseForPlayer('),'level opening does not use fail-soft player roll');
assert(!levelOpening.includes('readLiveOpsConfig(env)'),'level opening reintroduced owner/admin LiveOps dependency');
assert(!levelOpening.includes('assertRolledLiveContentCaseRoutes('),'level opening can still fail after claiming because of control-plane route validation');
assert(opening.includes('readCaseRuntimeConfig(env)'),'granted opening does not use isolated case config');
assert(opening.includes('rollLevelCaseForPlayer('),'granted opening does not use fail-soft player roll');
assert(!opening.includes('readLiveOpsConfig(env)'),'granted opening reintroduced owner/admin LiveOps dependency');
assert(!opening.includes('assertRolledLiveContentCaseRoutes('),'granted opening can still strand a claim on route validation');
assert(existing.includes('readCaseRuntimeConfig(env)'),'committed receipt replay still depends on owner/admin LiveOps');
assert(!existing.includes('readLiveOpsConfig(env)'),'committed receipt replay reintroduced control-plane dependency');
const purchase=between(worker,'async function purchaseCaseFromShop','async function releaseGrantedCaseOpeningReservations');
assert(purchase.includes('readCaseRuntimeConfig(env)'),'case purchase still bootstraps owner/admin LiveOps');
assert(!purchase.includes('readLiveOpsConfig(env)'),'case purchase reintroduced owner/admin LiveOps dependency');

const caseAvailability=between(worker,'async function caseDataPlaneFeatureEnabled','async function getLevelCaseState');
for(const forbidden of ['ensureMaintenanceSchema(','ensureFeatureFlagsSchema(','ensureOperationsSecuritySchema(','CREATE TABLE','ALTER TABLE','INSERT INTO','UPDATE ','DELETE FROM']){
  assert(!caseAvailability.includes(forbidden),`case availability guard mutates control-plane state via ${forbidden}`);
}
assert(caseAvailability.includes('case data-plane feature flag read failed; using enabled default'),'case feature flag storage failure can still take opening down');
assert(caseAvailability.includes('case data-plane maintenance read failed; keeping cases available'),'maintenance storage failure can still take opening down');
assert(levelOpening.includes('requireCaseDataPlaneAvailable('),'level opening does not use read-only case availability guard');
assert(!levelOpening.includes('requirePlayerOperationAvailable('),'level opening still enters generic control-plane availability bootstrap');
assert(opening.includes('requireCaseDataPlaneAvailable('),'granted opening does not use read-only case availability guard');
assert(!opening.includes('requirePlayerOperationAvailable('),'granted opening still enters generic control-plane availability bootstrap');
assert(purchase.includes('requireCaseDataPlaneAvailable('),'case purchase does not use read-only case availability guard');
assert(!purchase.includes('requirePlayerOperationAvailable('),'case purchase still enters generic control-plane availability bootstrap');
const physicalPrepare=between(worker,'async function prepareCasePhysicalRewards','async function releaseCasePhysicalStock');
assert(physicalPrepare.includes('case physical reward subsystem unavailable; falling back to points'),'physical reward subsystem can still abort an otherwise valid case opening');
assert(physicalPrepare.includes('return { statements:[], stockConsumptionIds:[] }'),'physical reward failure does not release the case into an evergreen points fallback');

const playerRoll=between(worker,'async function rollLevelCaseForPlayer','const LIVEOPS_CONFIG_CACHE_TTL_MS');
assert(playerRoll.includes('caseFutureRoutesStillValidReadOnly'),'player roll does not recheck future rewards read-only');
assert(playerRoll.includes('caseRuntimeConfigWithoutFutureContent'),'future content outage cannot fall back to evergreen rewards');
assert(!playerRoll.includes('assertRolledLiveContentCaseRoutes('),'player roll still calls throwing control-plane validator');

const stateHandler=between(worker,'async function getLevelCaseState','async function readLevelCaseOpening');
assert(stateHandler.includes('body.fast === true || body.recovery === true'),'opening recovery can still fall into full case payload');
assert(stateHandler.includes('includeRecentOpenings:body.recovery === true'),'fast recovery does not include immutable receipts');
const fastRefresh=between(worker,'async function buildFastCaseRefreshPayload','function buildFastCaseOpenPayload');
assert(fastRefresh.includes('options?.includeRecentOpenings === true'),'fast refresh cannot include recovery receipts');
assert(fastRefresh.includes('recentCaseOpeningsForPlayer(env,id,8)'),'recovery receipt query missing');
const clientRecovery=between(index,'async function loadCaseStateForOpeningRecovery','function presentConfirmedLevelCase');
assert(clientRecovery.includes('loadCaseState(true, true, true)'),'client opening recovery still calls full LiveOps case state');
const giftedWait=between(index,'async function waitForGrantedCaseResult','async function openGiftedCaseClient');
assert(giftedWait.includes('let activeRequestId = String(requestId || "")'),'client recovery cannot switch to the server-owned opening token');
assert(giftedWait.includes('status?.adopted === true'),'client recovery ignores server adoption of an in-flight case');
assert(giftedWait.includes('requestId: activeRequestId'),'client recovery does not poll/resume the adopted opening token');
assert(giftedWait.includes('rememberGrantedCasePendingRequest(caseType, activeRequestId'),'adopted opening token is not persisted for reload safety');
assert(giftedWait.includes('let lastResumeAt = 0'),'client recovery still allows only one resume attempt per user tap');
assert(giftedWait.includes('Date.now() - lastResumeAt >= 900'),'same idempotent opening is not retried after a transient recovery failure');
assert(giftedWait.includes('forgetGrantedCasePendingRequest(caseType, activeRequestId);'),'successful adopted resume leaves a stale local opening token behind');

const storageAliases=between(worker,'const CASE_STORAGE_ALIASES','function caseGrantId');
for(const alias of ['small','standart','standard','common','sweet','silver','gold','mythic','legendary','alex'])assert(storageAliases.includes(`"${alias}"`),`granted case storage alias missing: ${alias}`);
assert(opening.includes('candidate.case_type IN (${storage.sql})'),'atomic granted-case claim rejects legacy storage aliases');
assert(opening.includes("case_type IN (${storage.sql}) AND status='opening'"),'same-type opening detection rejects legacy storage aliases');
assert(statusHandler.includes('case_type IN (${storage.sql})'),'status adoption rejects legacy storage aliases');
assert(fullCasePayload.includes('giftedCases[type] = safeAdminNumber(giftedCases[type]) + safeAdminNumber(row.count)'),'full inventory overwrites alias counts instead of summing them');
assert(inventory.includes('giftedCases[type] = safeAdminNumber(giftedCases[type]) + safeAdminNumber(row.count)'),'fast inventory overwrites alias counts instead of summing them');

const reservationRecovery=between(worker,'async function releaseGrantedCaseOpeningReservations','async function recoverGrantedCaseRequestLease');
assert(!reservationRecovery.includes('ensureShopStockSchema('),'stale case recovery still bootstraps the shop control plane');
assert(!reservationRecovery.includes('await releaseShopStock('),'stale case recovery still calls schema-bootstrapping stock release');
assert(reservationRecovery.includes('DELETE FROM shop_stock_consumptions'),'stale case recovery no longer releases an already-existing reservation');
assert(reservationRecovery.includes('return 0;'),'stock cleanup lookup is not fail-soft');
const leaseRecovery=between(worker,'async function recoverGrantedCaseRequestLease','async function recoverStaleGrantedCaseOpenings');
assert(leaseRecovery.includes("console.error('Granted-case lease recovered; stock cleanup deferred'"),'lease recovery can still fail after the case row was safely reset');


// Dedicated ordinary-case lane: ordinary is the only historical type that had
// several legacy ids (standardCase/standart/common/case-small). Keep it fully
// isolated so generic LiveOps changes cannot strand it again.
assert(worker.includes('async function openOrdinaryGrantedCase(request,env,ctx=null)'),'dedicated ordinary opening handler missing');
assert(worker.includes('async function getOrdinaryCaseOpenStatus(request,env)'),'dedicated ordinary status handler missing');
const ordinary=between(worker,'async function openOrdinaryGrantedCase','async function openGrantedCase');
assert(ordinary.includes("rollOrdinaryCaseIsolated()"),'ordinary lane does not use isolated code-default roll');
assert(ordinary.includes("LOWER(TRIM(case_type)) IN"),'ordinary lane does not normalize historical storage ids');
assert(ordinary.includes("status='pending',opening_started_at=0,opening_token='',case_type='small'"),'ordinary lane cannot reclaim orphaned opening rows');
assert(ordinary.includes("opening_token=? AND opening_started_at=0"),'ordinary lane cannot repair zero-timestamp legacy opening rows');
assert(ordinary.includes("granted_case_opening_guards"),'ordinary lane has no atomic opening guard');
assert(worker.includes('fallbackFromBooster:true'),'ordinary utility-booster failure has no safe reward fallback');
for(const forbidden of ['readLiveOpsConfig(','readCaseRuntimeConfig(','prepareCasePhysicalRewards(','assertRolledLiveContentCaseRoutes(','releaseShopStock(','ensureShopStockSchema('])assert(!ordinary.includes(forbidden),`ordinary lane reintroduced shared dependency ${forbidden}`);
for(const legacy of ['standardcase','standartcase','smallcase','ordinarycase','standard_case','standart_case','small_case','ordinary_case','standard-case','standart-case','small-case','ordinary-case','case-small','case_small','ordinary','normal','regular'])assert(worker.includes(`"${legacy}"`),`ordinary legacy alias ${legacy} missing`);
assert(worker.includes('"/api/cases/open-ordinary"'),'ordinary opening route missing');
assert(worker.includes('"/api/cases/open-ordinary/status"'),'ordinary status route missing');
assert(index.includes('CASE_API_OPEN_ORDINARY_PATH = "/api/cases/open-ordinary"'),'client ordinary opening endpoint missing');
assert(index.includes('CASE_API_OPEN_ORDINARY_STATUS_PATH = "/api/cases/open-ordinary/status"'),'client ordinary status endpoint missing');
assert(index.includes('caseExperienceNormalizeType(caseType) === "small" ? CASE_API_OPEN_ORDINARY_PATH : CASE_API_OPEN_GRANTED_PATH'),'client does not route small through dedicated opening lane');
assert(index.includes('caseExperienceNormalizeType(caseType) === "small" ? CASE_API_OPEN_ORDINARY_STATUS_PATH : CASE_API_OPEN_GRANTED_STATUS_PATH'),'client does not route small status through dedicated lane');

assert(gate.includes("['case opening stability', 'node', ['scripts/check-case-stability.mjs']]"),'Production Gate does not enforce case stability');

console.log(`Case stability checks passed: ${checks} invariants.`);
