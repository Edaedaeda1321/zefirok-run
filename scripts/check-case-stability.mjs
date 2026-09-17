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
assert(wait.includes('CASE_API_OPEN_GRANTED_STATUS_PATH'),'poll loop does not use read-only status endpoint');
assert(occurrences(wait,'CASE_API_OPEN_GRANTED_PATH')===1,'poll loop may invoke mutation more than once');
assert(wait.includes('requestId, resume: true'),'mutation retry is not an explicit same-request resume');
assert(!wait.includes('CASE_API_OPEN_GRANTED_PATH,\n              { caseType: String(caseType || ""), requestId },'),'poll loop still retries bare mutation endpoint');

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
const statusHandler=between(worker,'async function getGrantedCaseOpenStatus','async function openGrantedCase');
assert(statusHandler.includes("state:'opened'"),'status handler cannot return immutable opened receipt');
assert(statusHandler.includes("state:'opening'"),'status handler cannot report active operation');
assert(statusHandler.includes("state:'stale'"),'status handler cannot report safely resumable stale operation');
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
assert(occurrences(worker,'giftedCaseOpenings:inventory.openingOperations||[]')===2,'opening metadata must be exposed by exactly purchase and refresh payloads');
assert(worker.includes('...(inventory?.openingOperations ? { giftedCaseOpenings: inventory.openingOperations } : {})'),'open payload does not expose active opening operations');

assert(worker.includes('"/api/cases/open-granted/status"'),'status path missing from worker');
const recoveryAware=between(worker,'const RECOVERY_AWARE_OPERATION_PATHS = new Set([',']);');
assert(recoveryAware.includes('/api/cases/open-granted/status'),'read-only status observer must bypass maintenance so a lost committed result remains recoverable');
assert(worker.includes('"/api/cases/open-granted/status","/api/cases/purchase"'),'Test Project does not isolate the new case status path');
assert(gate.includes("['case opening stability', 'node', ['scripts/check-case-stability.mjs']]"),'Production Gate does not enforce case stability');

console.log(`Case stability checks passed: ${checks} invariants.`);
