import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { handleZeffiWorldApi } from '../../src/zeffi-world-service.js';
import { createStoryProgressClient } from '../story/progress-client.js';
import { buildStoryMap, validateStoryMap } from '../story/map.js';
import { createDemoState } from '../story/model.js';
import { mapStateWithFund } from '../story/shared-fund.js';

function fixture(){
 const db=new DatabaseSync(':memory:');
 db.exec('PRAGMA foreign_keys=ON; CREATE TABLE admin_profile_state(telegram_id TEXT PRIMARY KEY,wallet INTEGER,coffee INTEGER,treats INTEGER,revision INTEGER);');
 db.exec('INSERT INTO admin_profile_state VALUES (\'12345\',70000000,500,1000,0),(\'67890\',70000000,500,1000,0)');
 for(const file of ['0115_zeffi_community_fund.sql','0118_zeffi_story_progression.sql','0124_zeffi_palace_memories.sql'])
  db.exec(readFileSync(new URL(`../../migrations/${file}`,import.meta.url),'utf8'));
 const adapter={prepare(sql){return{first:async()=>db.prepare(sql).get()??null,all:async()=>({results:db.prepare(sql).all()}),bind(...args){const stmt=db.prepare(sql);return{
  first:async()=>stmt.get(...args)??null,
  all:async()=>({results:stmt.all(...args)}),
  run:async()=>{const meta=stmt.run(...args);return {meta:{changes:Number(meta.changes)}};}
 };}}}};
 const env={DB:adapter,WORLD_ENABLED:'true',WORLD_STORY_ENABLED:'true',WORLD_TESTER_IDS:'12345,67890'};
 const deps={resolvePlayerAuth:async(_req,body)=>body?.initData==='signed'?{telegramId:body.asUser||'12345'}:null,
  ensureAuthoritativeProfileRow:()=>{throw Error('Story route must not read wallet/profile');},
  requirePlayerOperationAvailable:()=>{throw Error('Story route must not change purchases');}};
 async function call(body={},options={}){
  const response=await handleZeffiWorldApi(new Request('https://zeffi.test/api/world/story/progress',{
   method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({initData:'signed',...body})
  }),{...env,...options.env},deps);
  return {status:response.status,body:await response.json()};
 }
 function fund(projectId,total){
  const milestone=projectId==='garden'?(total>=1000000?1:0):total>=50000000?3:total>=30000000?2:total>=12500000?1:0;
  db.prepare('UPDATE zeffi_community_projects SET total_points=?,stage=?,revision=revision+1 WHERE project_id=?').run(total,milestone,projectId);
 }
 const wallets=()=>db.prepare('SELECT * FROM admin_profile_state ORDER BY telegram_id').all();
 const snapshot=()=>({wallets:wallets(),visits:db.prepare('SELECT * FROM zeffi_story_visits ORDER BY telegram_id,place_id').all(),players:db.prepare('SELECT * FROM zeffi_story_players ORDER BY telegram_id').all(),
  fund:db.prepare('SELECT * FROM zeffi_community_projects ORDER BY project_id').all()});
 return {db,adapter,env,call,fund,wallets,snapshot};
}
const visit=(f,placeId,extra={})=>f.call({op:'visit',placeId,...extra});
const advance=(f,chapter,revision)=>f.call({op:'advance',expectedChapter:chapter,expectedRevision:revision});
const state=f=>f.call({op:'state'});

test('0118 adds independent story tables and two global D1 events with existing fund links',async()=>{
 const f=fixture();const r=await state(f);assert.equal(r.status,200);
 assert.deepEqual([r.body.chapter,r.body.revision,r.body.completed],[0,0,false]);
 assert.deepEqual(r.body.unlockedDistricts.sort(),['square','cafe','belkino','friends','station','community-garden','palace'].sort());
 assert.equal(r.body.events.garden.total,0);assert.equal(r.body.events.festival.status,'active');
 assert.deepEqual(f.db.prepare('SELECT event_id,project_id,enabled FROM zeffi_story_events ORDER BY event_id').all().map(x=>({...x})),
  [{event_id:'festival',project_id:'festival',enabled:1},{event_id:'garden',project_id:'garden',enabled:1}]);
 f.db.close();
});
test('visits persist and replay is idempotent; areas cannot be spoofed before unlock',async()=>{
 const f=fixture();const start=f.wallets();
 assert.equal((await visit(f,'festival')).body.code,'STORY_PLACE_LOCKED');
 assert.equal((await visit(f,'mystery')).status,400);
 assert.equal((await visit(f,'square')).status,200);
 const repeat=await visit(f,'square');assert.equal(repeat.body.repeated,true);
 assert.equal((await state(f)).body.visited.filter(v=>v==='square').length,1);
 assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM zeffi_story_visits').get().n,1);
 assert.deepEqual(f.wallets(),start);f.db.close();
});
test('chapter 1 requires actual visits, never client submitted targets or completion flags',async()=>{
 const f=fixture();assert.equal((await advance(f,0,0)).body.code,'STORY_GOALS_INCOMPLETE');
 for(const id of ['square','cafe'])assert.equal((await visit(f,id)).status,200);
 assert.equal((await advance(f,0,0)).status,409);
 await visit(f,'belkino');const ready=await state(f);assert.equal(ready.body.canAdvance,true);
 const done=await advance(f,0,0);assert.equal(done.status,200);assert.equal(done.body.chapter,1);
 assert.ok(done.body.unlockedDistricts.includes('festival'));
 const again=await advance(f,0,0);assert.equal(again.body.repeated,true);assert.equal(again.body.chapter,1);
 const stale=await advance(f,1,0);assert.equal(stale.status,409);
 assert.deepEqual({...f.db.prepare("SELECT chapter,revision,unlocked_mask FROM zeffi_story_players WHERE telegram_id='12345'").get()},{chapter:1,revision:1,unlocked_mask:1});
 f.db.close();
});
test('shared garden completion is required for chapter 2; festival project only for chapter 3',async()=>{
 const f=fixture();for(const place of ['square','cafe','belkino'])await visit(f,place);
 await advance(f,0,0);
 for(const place of ['friends','station','community-garden'])await visit(f,place);
 assert.equal((await state(f)).body.canAdvance,false);
 assert.equal((await advance(f,1,1)).status,409);
 f.fund('garden',1_000_000);
 const gate=await state(f);assert.equal(gate.body.canAdvance,true);assert.equal(gate.body.events.garden.status,'completed');
 const step=await advance(f,1,1);assert.equal(step.body.chapter,2);assert.ok(step.body.unlockedDistricts.includes('rabbit'));
 for(const place of ['festival','rabbit'])await visit(f,place);
 assert.equal((await advance(f,2,2)).body.code,'STORY_GOALS_INCOMPLETE');
 f.fund('festival',50_000_000);
 const complete=await advance(f,2,2);assert.equal(complete.body.completed,true);assert.equal(complete.body.chapter,3);
 assert.equal(complete.body.unlockedDistricts.includes('mystery'),false);
 assert.equal(f.db.prepare("SELECT unlocked_mask FROM zeffi_story_players WHERE telegram_id='12345'").get().unlocked_mask,3);
 assert.equal((await state(f)).body.currentChapter,null);
 f.db.close();
});
test('paused story event cannot advance even after shared funding completes',async()=>{
 const f=fixture();for(const x of ['square','cafe','belkino'])await visit(f,x);
 await advance(f,0,0);for(const x of ['friends','station','community-garden'])await visit(f,x);
 f.fund('garden',1_000_000);f.db.prepare("UPDATE zeffi_story_events SET enabled=0 WHERE event_id='garden'").run();
 assert.equal((await state(f)).body.events.garden.status,'paused');
 assert.equal((await advance(f,1,1)).body.code,'STORY_GOALS_INCOMPLETE');
 f.db.prepare("UPDATE zeffi_story_events SET enabled=1 WHERE event_id='garden'").run();
 assert.equal((await advance(f,1,1)).status,200);f.db.close();
});
test('separate Telegram players see shared events but independent visits and chapters',async()=>{
 const f=fixture();await visit(f,'square');f.fund('garden',1_000_000);
 const another=await f.call({op:'state',asUser:'67890'});assert.equal(another.status,200);
 assert.deepEqual(another.body.visited,[]);assert.equal(another.body.chapter,0);
 assert.equal(another.body.events.garden.finished,true);
 assert.deepEqual((await state(f)).body.visited,['square']);f.db.close();
});
test('signed allowlist, World switch, story switch and payload limits guard writes',async()=>{
 const f=fixture();const before=f.snapshot();
 for(const body of [{op:'state',initData:'forged'},{op:'visit',placeId:'square',asUser:'99999'}]){
  assert.ok([401,403].includes((await f.call(body)).status));
 }
 assert.equal((await f.call({op:'visit',placeId:'square'},{env:{WORLD_ENABLED:'false'}})).status,403);
 assert.equal((await f.call({op:'visit',placeId:'square'},{env:{WORLD_STORY_ENABLED:'false'}})).status,403);
 assert.equal((await f.call({op:'visit',placeId:'square'},{env:{WORLD_TESTER_IDS:''}})).status,403);
 assert.equal((await f.call({op:'visit',placeId:'square',telegramId:'67890',chapter:3,completed:true,points:10000000})).status,200);
 assert.equal((await state(f)).body.chapter,0);
 assert.deepEqual(f.wallets(),before.wallets);
 f.db.close();
});
test('story progression uses authoritative map chapter, not default shared-fund forced unlocks',()=>{
 const s=createDemoState();s.chapter=0;
 const remote={projects:{garden:{finished:false},festival:{total:0}}};
 const mapped=mapStateWithFund(s,remote);assert.equal(mapped.chapter,0);
 assert.equal(buildStoryMap(mapped).objects.some(o=>o.uid==='story-festival'),false);
 for(const chapter of [0,1,2,3])assert.deepEqual(validateStoryMap(buildStoryMap({...mapped,chapter})),[]);
});
test('browser story client signs POST, validates server response and cannot auto-contribute',async()=>{
 const f=fixture();const calls=[];
 const client=createStoryProgressClient('signed',{fetchFn:async(url,options)=>{
  calls.push({url,body:JSON.parse(options.body),method:options.method,credentials:options.credentials});
  return handleZeffiWorldApi(new Request('https://zeffi.test'+url,{method:'POST',body:options.body,headers:options.headers}),f.env,{
   resolvePlayerAuth:async()=>({telegramId:'12345'}),ensureAuthoritativeProfileRow:()=>{throw Error('wallet');},requirePlayerOperationAvailable:()=>{throw Error('purchases');}
  });
 }});
 await client.read();await client.visit('square');
 assert.deepEqual(calls.map(x=>x.body.op),['state','visit']);assert.equal(calls[0].credentials,'same-origin');
 assert.equal(calls[1].body.initData,'signed');
 assert.ok(calls.every(x=>x.url==='/api/world/story/progress'));
 f.db.close();
});
test('corrupt persisted district bitmask fails closed instead of showing an unauthorized region',async()=>{
 const f=fixture();for(const place of ['square','cafe','belkino'])await visit(f,place);
 assert.equal((await advance(f,0,0)).status,200);
 f.db.prepare("UPDATE zeffi_story_players SET unlocked_mask=0 WHERE telegram_id='12345'").run();
 const response=await state(f);
 assert.equal(response.status,503);
 assert.equal(response.body.code,'STORY_SCHEMA_NOT_READY');
 assert.equal((await visit(f,'rabbit')).status,503);
 f.db.close();
});
test('schema not ready fails closed without touching wallets, while older data remains intact',async()=>{
 const f=fixture(),before=f.wallets();
 f.db.exec('DROP TABLE zeffi_story_visits');
 const response=await state(f);
 assert.equal(response.status,503);
 assert.equal(response.body.code,'STORY_SCHEMA_NOT_READY');
 assert.deepEqual(f.wallets(),before);
 f.db.close();
});
