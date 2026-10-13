#!/usr/bin/env node
// Closed Release Candidate contract for the production-hosted World.
// No D1, Telegram network, currency writes or production data are used here.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {handleZeffiWorldApi} from '../src/zeffi-world-service.js';

const allRoutes = [
 '/api/world/state',
 '/api/world/mutate',
 '/api/world/tutorial',
 '/api/world/story-access',
 '/api/world/community/state',
 '/api/world/community/contribute'
];
function request(path, initData='signed-fixture') {
 return new Request(`https://rc.local${path}`, {
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({initData,telegramId:'12345',initDataUnsafe:{user:{id:12345}}})
 });
}
let calls=0;
const deps = (signedId='12345') => ({
 resolvePlayerAuth:async (_request,body)=>{calls++;return body.initData==='signed-fixture'?{telegramId:signedId}:null;},
 ensureAuthoritativeProfileRow:async()=>{throw new Error('World RC auth checks must not touch wallet');},
 requirePlayerOperationAvailable:async()=>{throw new Error('World RC auth checks must not touch operations');}
});
async function result(path,env,signedId='12345',initData='signed-fixture') {
 const response=await handleZeffiWorldApi(request(path,initData), {
  ...env,
  get DB(){throw new Error('World RC access gate must not touch D1');}
 }, deps(signedId));
 const json=await response.json();
 assert.match(response.headers.get('cache-control'),/no-store/);
 return {status:response.status,...json};
}

for(const path of allRoutes) {
 calls=0;
 const disabled=await result(path,{WORLD_ENABLED:'false',WORLD_TESTER_IDS:'12345'});
 assert.equal(disabled.status,403,`${path}: disabled`);
 assert.equal(disabled.code,'WORLD_DISABLED',`${path}: disabled error code`);
 assert.equal(calls,0,`${path}: global disable must run before user lookup`);
 const unsigned=await result(path,{WORLD_ENABLED:'true',WORLD_TESTER_IDS:'12345'},'12345','forged-signature');
 assert.equal(unsigned.status,401,`${path}: forged Telegram identity`);
 const unlisted=await result(path,{WORLD_ENABLED:'true',WORLD_TESTER_IDS:'12345'},'99999');
 assert.equal(unlisted.status,403,`${path}: unlisted Telegram identity`);
 assert.equal(unlisted.code,'WORLD_NOT_AVAILABLE',`${path}: allowlist error`);
 const empty=await result(path,{WORLD_ENABLED:'true',WORLD_TESTER_IDS:''});
 assert.equal(empty.status,403,`${path}: allowlist fail-closed`);
 console.log(`PASS closed RC route: ${path}`);
}
const allowed=await result('/api/world/story-access',{WORLD_ENABLED:'true',WORLD_TESTER_IDS:'12345',WORLD_STORY_ENABLED:'true'});
assert.equal(allowed.status,200,'valid signed allowlisted view is still accessible');
assert.equal(allowed.ok,true);
assert.equal(allowed.walletWrites,false,'story-access response must not authorize money changes');

const read = relative => readFileSync(new URL(`../${relative}`,import.meta.url),'utf8');
const runner=read('index.html'),personal=read('world.html'),story=read('story-world.html'),app=read('world/app.js'),storyApp=read('world/story/app.js'),ignore=read('.assetsignore');
assert.ok(runner.includes("'./world.html'"),'hosted runner must open gated personal city');
assert.ok(!runner.includes('world.html?world_tester=1'),'old URL unlock cannot be part of hosted entry');
assert.ok(personal.includes("request('/api/world/state')"),'personal city must verify server D1 state');
assert.ok(personal.includes('personal.payload?.serverAuthoritative===true'),'city state must be server-authoritative');
assert.ok(!personal.includes('world_tester=1'),'old URL flag must not be used');
assert.ok(ignore.includes('Mir_Zeffi_Park_Belkino_4_Views_v1/'),'standalone world art pack must not ship as static assets');
assert.ok(story.includes('СТРОИМ ВМЕСТЕ'),'story header must not display demo branding');
assert.ok(!story.includes('ТЕСТ ·') && !story.includes('МЕНЮ ТЕСТЕРА'),'hosted story header must not display tester badges');
assert.ok(app.includes('if(SERVER_MODE)return;')&&app.includes('if(!SERVER_MODE)window.WorldZeffiSandbox'),'hosted city must not store sandbox changes');
assert.ok(storyApp.includes("if(liveMode)return;persistent=saveDemo"),'hosted story must not store simulated state');
assert.ok(storyApp.includes("$('modeBadge').hidden=liveMode"),'test menu must be hidden in hosted story');
console.log('World Zeffi closed Release Candidate: signed allowlist, emergency switch, hosted UI, no local wallet fallback PASS');
