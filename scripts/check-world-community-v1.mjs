#!/usr/bin/env node
// Read-only, repository-local release guard for production-funded story projects.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const read=f=>fs.readFileSync(f,'utf8');let checks=0;
const ok=(label,v)=>{assert.ok(v,label);checks++;console.log('PASS '+label);};
const service=read('src/zeffi-world-service.js'),fund=read('src/zeffi-community-fund.js');
const app=read('world/story/app.js'),boot=read('world/story/boot.js'),gate=read('scripts/check-production-gate.mjs');
const sql=read('migrations/0115_zeffi_community_fund.sql');
const migration=JSON.parse(read('scripts/migration-history.lock.json'));
ok('new additive 0115 migration is locked',migration.files['0115_zeffi_community_fund.sql']===createHash('sha256').update(sql).digest('hex'));
ok('same existing world Worker route is reused',service.includes("import {handleCommunityFund} from './zeffi-community-fund.js'")&&service.includes('return handleCommunityFund('));
ok('community API cannot bypass signed auth and tester allowlist',service.indexOf('assertTester(env,telegramId);')>0&&service.indexOf('assertTester(env,telegramId);')<service.indexOf('if(isCommunityRequest){'));
ok('personal city remains blocked under its old flag',service.includes("if(!isCommunityRequest&&new URL(request.url).pathname!=='/api/world/story-access'&&!worldEnabled(env)"));
ok('separate global funding and contributions release flags',fund.includes('WORLD_COMMUNITY_FUND_ENABLED')&&fund.includes('WORLD_COMMUNITY_CONTRIBUTIONS_ENABLED')&&fund.includes('WORLD_PURCHASES_ENABLED'));
ok('community API checks the original player op gate',fund.includes("operationGate(telegramId,['purchases'])")&&fund.includes('operationGate(telegramId,[])'));
ok('user identity comes from Worker, not client-supplied telegramId',service.includes('telegramId=String(auth?.telegramId')&&!/body\.telegramId|body\.userId/.test(fund));
ok('same player wallet debited only through D1 guarded batch',fund.includes('UPDATE admin_profile_state')&&fund.includes('await db.batch(statements)')&&fund.includes('wallet>=?')&&fund.includes('updated_by=?'));
ok('fund project guard records the exact operation marker',fund.includes('last_request_id=?')&&fund.includes('AND last_request_id=?')&&sql.includes('last_request_id TEXT'));
ok('durable receipt prevents accidental double debit',sql.includes('PRIMARY KEY (telegram_id,request_id)')&&fund.includes('readReceipt(db,telegramId,requestId)'));
ok('only two known funded projects and fixed milestones',sql.includes("'festival',50000000")&&sql.includes("'garden',1000000")&&fund.includes('12_500_000,30_000_000,50_000_000'));
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
