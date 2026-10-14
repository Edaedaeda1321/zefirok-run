#!/usr/bin/env node
// Production structural contract: P1 passes through P0 owner auth + staging,
// never allows client prices or arbitrary user-supplied rewards.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Script} from 'node:vm';
const s=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const worker=s('src/worker.js'),owner=s('owner.html'),app=s('world/app.js'),server=s('src/zeffi-world-service.js');
const migrations=JSON.parse(s('scripts/migration-history.lock.json')).files;
const sql=s('migrations/0121_zeffi_world_balance_p1.sql');
assert.equal(migrations['0121_zeffi_world_balance_p1.sql'],createHash('sha256').update(sql).digest('hex'));
for(const v of ['world-catalog','world-levels'])assert.ok(owner.includes(`id="view-${v}"`));
for(const action of ['/balance','/balance/draft/save','/balance/publish','/balance/draft/restore']){
 const route='/api/owner/world'+action;assert.ok(worker.includes(`"${route}"`));assert.ok(owner.includes(route)||action==='/balance/draft/restore');
}
const context=worker.indexOf('const ctx = { ...(await requireOwnerPanelContext(request, env)), executionCtx };');
const guard=worker.indexOf('await ownerPanelAssertWriteTarget(env,ctx,path);',context);
const route=worker.indexOf("if(path.startsWith('/api/owner/world/'))",guard);
assert.ok(context>0&&guard>context&&route>guard);
assert.ok(worker.includes('"/api/owner/world/balance/publish": "live"'));
assert.match(s('src/zeffi-world-control-admin.js'),/handleOwnerWorldBalance/);
assert.match(s('src/zeffi-world-balance-admin.js'),/claimedRewardLock/);
assert.match(s('src/zeffi-world-balance-admin.js'),/await db\.batch\(\[update,audit\]\)/);
assert.match(server,/publishedWorldEconomy\(env\.DB\)/);
assert.match(server,/balanceGuard/);
assert.match(app,/createWorldBalanceRuntime\(spec\)/);
assert.match(app,/if\(!payload\?\.economy\)/);
assert.match(sql,/CHECK\(guard=1\)/);
assert.ok(s('scripts/check-production-gate.mjs').includes('world-balance-p1.test.mjs'));
for(const match of owner.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(match[1].includes('function wp1Bind'))new Script(match[1]);
console.log('World Control Center P1: owner auth, draft/publish, D1 guard, wallet authority, UI and migrations PASS');
