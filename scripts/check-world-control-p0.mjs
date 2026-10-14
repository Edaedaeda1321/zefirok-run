#!/usr/bin/env node
// Production structural gate: owner-only World P0, signed runtime policy and migrations.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const r=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const owner=r('owner.html'),worker=r('src/worker.js'),runtime=r('src/zeffi-world-service.js');
const admin=r('src/zeffi-world-control-admin.js'),policy=r('src/zeffi-world-control.js');
const migration=r('migrations/0120_zeffi_world_control_center_p0.sql');
const gate=r('scripts/check-production-gate.mjs');
for(const view of ['world-overview','world-access','world-monitor'])assert.ok(owner.includes(`id="view-${view}"`),`missing World P0 view ${view}`);
assert.ok(owner.includes('data-group="world" data-view="world-overview"'),'World tab must appear in desktop navigation');
assert.ok(owner.includes('data-cc27-more-view="world-overview"'),'World tab must appear in mobile navigation');
for(const path of ['overview','access','monitor','config/save','tester/add','tester/remove']){
 assert.ok(worker.includes(`/api/owner/world/${path}`),`Worker route missing: ${path}`);
 assert.ok(owner.includes(`/api/owner/world/${path}`),`CC client route missing: ${path}`);
}
const auth=worker.indexOf('const ctx = { ...(await requireOwnerPanelContext(request, env)), executionCtx };');
const stage=worker.indexOf('await ownerPanelAssertWriteTarget(env,ctx,path);',auth);
const route=worker.indexOf("if(path.startsWith('/api/owner/world/'))",stage);
assert.ok(auth>0&&stage>auth&&route>stage,'P0 API MUST execute existing owner authentication and STAGING guard first');
assert.ok(admin.includes('ctx?.access?.owner')&&admin.includes('db.batch([update,receipt])'),'owner-only and D1 atomic CAS required');
assert.ok(migration.includes('CHECK(guard=1)')&&migration.includes('zeffi_world_control_audit'),'D1 settings need immutable guarded audit');
assert.ok(runtime.includes('if(!worldEnabled(env))')&&runtime.indexOf('if(!worldEnabled(env))')<runtime.indexOf('env=await assertTester(env,telegramId);'),'emergency switch must run before D1 release policy');
assert.ok(runtime.indexOf('resolvePlayerAuth(request,body,env)')<runtime.indexOf('env=await assertTester(env,telegramId);'),'signed Telegram auth must precede World rollout');
assert.ok(runtime.includes('observedWorldResponse(await handleCommunityFund')&&runtime.includes('observedWorldResponse(await handleZeffiStory'),'common city/fund errors must reach the P0 monitor');
assert.ok(policy.includes('recordWorldControlRetry')&&migration.includes('zeffi_world_control_retries'),'idempotent retry counter must stay separate from HTTP errors');
assert.ok(policy.includes('WORLD_PURCHASES_ENABLED:restrictive')&&policy.includes('WORLD_STORY_ENABLED:restrictive'),'D1 settings must only RESTRICT pre-existing Cloudflare environment gates');
assert.ok(!/db\.prepare\(\s*`CREATE\s+TABLE/i.test(runtime),'runtime world requests must never create schema');
assert.ok(gate.includes('world/tests/world-control-p0.test.mjs'),'P0 SQLite tests missing from release gate');
const htmlScripts=[...owner.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
for(const s of htmlScripts){if(s[1].includes('async function boot(){')){
 const check=await import('node:vm');new check.Script(s[1],{filename:'owner-inline.js'});
 }}
console.log('World Control Center P0 static auth/staging/UI/migrations/routing checks PASS');
