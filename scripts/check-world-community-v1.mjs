#!/usr/bin/env node
// Read-only, repository-local release guard for production-funded story projects.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const read=f=>fs.readFileSync(f,'utf8');let checks=0;
const ok=(label,v)=>{assert.ok(v,label);checks++;console.log('PASS '+label);};
const service=read('src/zeffi-world-service.js'),fund=read('src/zeffi-community-fund.js');
const app=read('world/story/app.js'),boot=read('world/story/boot.js'),gate=read('scripts/check-production-gate.mjs');
const sql=read('migrations/0115_zeffi_community_fund.sql'),launchSql=read('migrations/0127_zeffi_garden_community_launch.sql');
const migration=JSON.parse(read('scripts/migration-history.lock.json'));
ok('new additive 0115 migration is locked',migration.files['0115_zeffi_community_fund.sql']===createHash('sha256').update(sql).digest('hex'));
// World P0 fund route guard v2: assert original fund handler and signed access.
const fundRoute=service.indexOf('if(isCommunityRequest){');
const fundEnd=service.indexOf('if(!env.DB)',fundRoute);
const fundBranch=fundRoute>=0&&fundEnd>fundRoute?service.slice(fundRoute,fundEnd):'';
const directFund=/return\s+handleCommunityFund\(\{/.test(fundBranch);
const monitoredFund=/return\s+observedWorldResponse\(await handleCommunityFund\(\{/.test(fundBranch)&&
  /\}\),env,new URL\(request\.url\)\.pathname\);/.test(fundBranch)&&
  service.includes('async function observedWorldResponse(')&&
  service.includes('return response;');
const signedAuth=service.indexOf('resolvePlayerAuth(request,body,env)');
const telegramValidation=service.indexOf("if(!/^\\d{4,20}$/.test(telegramId))failure(401,'WORLD_UNAUTHORIZED'");
const oldAccess=service.indexOf('assertTester(env,telegramId);');
const newAccess=service.indexOf('env=await assertTester(env,telegramId);');
const accessCheck=newAccess>=0?newAccess:oldAccess;
const worldOff=service.indexOf("if(!worldEnabled(env))failure(403,'WORLD_DISABLED'");
ok('same existing world Worker route is reused',
  service.includes("import {handleCommunityFund} from './zeffi-community-fund.js'")&&
  fundRoute>=0&&fundEnd>fundRoute&&(directFund||monitoredFund));
ok('community API cannot bypass signed auth and release access policy',
  worldOff>=0&&worldOff<signedAuth&&signedAuth>0&&
  telegramValidation>signedAuth&&accessCheck>telegramValidation&&
  accessCheck<fundRoute&&fundRoute<fundEnd);
// WORLD_ENABLED is a global fail-closed guard before personal and community routes.
// Test its order and exact disabled response; do not depend on the retired conditional.
ok('personal city and community fund both require WORLD_ENABLED',
  worldOff>=0&&worldOff<signedAuth&&accessCheck>signedAuth&&accessCheck<fundRoute);
ok('separate global funding and contributions release flags',fund.includes('WORLD_COMMUNITY_FUND_ENABLED')&&fund.includes('WORLD_COMMUNITY_CONTRIBUTIONS_ENABLED')&&fund.includes('WORLD_PURCHASES_ENABLED'));
ok('community API checks the original player op gate',fund.includes("operationGate(telegramId,['purchases'])")&&fund.includes('operationGate(telegramId,[])'));
ok('user identity comes from Worker, not client-supplied telegramId',service.includes('telegramId=String(auth?.telegramId')&&!/body\.telegramId|body\.userId/.test(fund));
ok('same player wallet debited only through D1 guarded batch',fund.includes('UPDATE admin_profile_state')&&fund.includes('await db.batch(statements)')&&fund.includes('wallet>=?')&&fund.includes('updated_by=?'));
ok('fund project guard records the exact operation marker',fund.includes('last_request_id=?')&&fund.includes('AND last_request_id=?')&&sql.includes('last_request_id TEXT'));
ok('durable receipt prevents accidental double debit',sql.includes('PRIMARY KEY (telegram_id,request_id)')&&fund.includes('readReceipt(db,telegramId,requestId)'));
ok('original 0115 schema untouched and small-garden 0127 preserved',sql.includes("'festival',50000000")&&sql.includes("'garden',1000000")&&launchSql.includes('goal_points = 60000')&&fund.includes('goal:60_000'));
ok('festivals hard-locked with atomic per-account daily cap',fund.includes("if(projectId!=='garden')fail(403")&&fund.includes('created_at>=? AND created_at<?)+?<=?'));
// Strip documentation comments, while keeping the SQL text in query strings.
// The existing service intentionally contains a comment about avoiding DDL.
const withoutJsComments = source => source
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^[ \t]*\/\/[^\r\n]*$/gm, '');
const withoutSqlComments = source => source.replace(/^[ \t]*--[^\r\n]*$/gm, '');
ok('no runtime DDL or destructive migration',
  !/\b(?:CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE)\b/i.test(withoutJsComments(service)+'\n'+withoutJsComments(fund)) &&
  !/\b(?:DROP\s+TABLE|DELETE\s+FROM\s+admin_profile_state)\b/i.test(withoutSqlComments(sql)));

ok('signed browser state and contribution routes',boot.includes('startStoryWorld({mode:\'tester\',initData})')&&app.includes('createSharedFundClient(initData)')&&read('world/story/shared-fund.js').includes('credentials:\'same-origin\''));
ok('real donation needs explicit confirmation',app.includes("openPanel('fund-confirm')")&&app.includes('data-action="fund-pay"')&&app.includes('pendingDonation'));
ok('network-ambiguous retries keep the same request ID',app.includes('pendingDonation')&&app.includes('sharedClient.contribute(pendingDonation)'));
ok('real modes cannot use local topups as fund contributions',app.includes("if(liveMode&&['contribute','festival-contribute','materials'"));
ok('offline compiler keeps hosted auth out of the standalone',read('scripts/build-world-story-v1.py').includes('boot\\.js')&&read('scripts/build-world-story-v1.py').includes("startStoryWorld({mode:'standalone'})"));
ok('fund tests and wiring are release-gated',gate.includes('community-fund-v1.test.mjs')&&gate.includes('check-world-community-v1.mjs'));
console.log(`Zeffi Community Fund v1: ${checks} checks PASS`);
