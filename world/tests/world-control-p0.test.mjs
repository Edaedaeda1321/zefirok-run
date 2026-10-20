import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {worldAccessPolicy,worldRolloutBucket,readWorldControl,recordWorldControlError,recordWorldControlRetry} from '../../src/zeffi-world-control.js';
import {handleOwnerWorldControl} from '../../src/zeffi-world-control-admin.js';
import {handleZeffiWorldApi} from '../../src/zeffi-world-service.js';

function fixture(){
 const sql=new DatabaseSync(':memory:');
 sql.exec("CREATE TABLE admin_profile_state(telegram_id TEXT PRIMARY KEY,wallet INTEGER,treats INTEGER,coffee INTEGER,revision INTEGER)");
 for(const name of ['0114_zeffi_world.sql','0115_zeffi_community_fund.sql','0117_zeffi_world_tutorial.sql','0118_zeffi_story_progression.sql','0119_zeffi_world_resident_requests.sql','0120_zeffi_world_control_center_p0.sql','0127_zeffi_garden_community_launch.sql'])
   sql.exec(readFileSync(new URL('../../migrations/'+name,import.meta.url),'utf8'));
 class Statement{
   constructor(source,args=[]){this.source=source;this.args=args;}
   bind(...args){return new Statement(this.source,args);}
   first(){return sql.prepare(this.source).get(...this.args)||null;}
   all(){return {results:sql.prepare(this.source).all(...this.args)};}
   run(){const result=sql.prepare(this.source).run(...this.args);return {meta:{changes:Number(result.changes)}};}
 }
 const db={prepare:query=>new Statement(query),async batch(statements){sql.exec('BEGIN IMMEDIATE');try{const r=statements.map(s=>s.run());sql.exec('COMMIT');return r;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 const env={DB:db,WORLD_ENABLED:'true',WORLD_TESTER_IDS:'12345',WORLD_PURCHASES_ENABLED:'true',WORLD_STORY_ENABLED:'true',WORLD_COMMUNITY_FUND_ENABLED:'true',WORLD_COMMUNITY_CONTRIBUTIONS_ENABLED:'true'};
 const ctx={access:{owner:true},user:{id:'99999'},body:{}};
 const control=(path,body={})=>handleOwnerWorldControl({env,ctx:{...ctx,body},path:'/api/owner/world/'+path});
 const requestId=n=>'world-control-request-'+String(n).padStart(7,'0');
 const cBody=(source,rev=0,n=1)=>({control:source,expectedRevision:rev,requestId:requestId(n),reason:'Причина изменения параметров запуска для тестирования',confirmPhrase:'МИР ЗЕФФИ'});
 return {sql,db,env,ctx,control,cBody,requestId,close:()=>sql.close()};
}

test('P0 migration is additive and release defaults remain tester-only',async()=>{
 const f=fixture();try{
  const a=await f.control('access');
  assert.equal(a.control.release_mode,'testers');assert.equal(a.control.rollout_percent,0);assert.equal(a.control.revision,0);
  assert.equal((await worldAccessPolicy(f.env,'12345')).allowed,true);
  assert.equal((await worldAccessPolicy(f.env,'99998')).allowed,false);
  assert.equal((await f.control('overview')).overview.cities,0);
  assert.deepEqual((await f.control('monitor')).health.missingTables,[]);
  const old=f.sql.prepare("SELECT COUNT(*) n FROM zeffi_world_cities").get().n;assert.equal(old,0);
 }finally{f.close();}
});

test('P0 tester list is D1-owned, revision-guarded, auditable and replay-safe',async()=>{
 const f=fixture();try{
  const payload={telegramId:'556677',expectedRevision:0,requestId:f.requestId(1),reason:'Добавление тестера для проверки строительства'};
  const add=await f.control('tester/add',payload);
  assert.equal(add.control.revision,1);assert.equal(add.testerCount,1);
  assert.equal((await worldAccessPolicy(f.env,'556677')).allowed,true);
  assert.equal((await f.control('tester/add',payload)).repeated,true);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM zeffi_world_control_audit').get().n,1);
  await assert.rejects(f.control('tester/remove',{telegramId:'556677',expectedRevision:0,requestId:f.requestId(2),reason:'Удаляем тестера после проверки проекта'}),e=>e.status===409);
  const remove=await f.control('tester/remove',{telegramId:'556677',expectedRevision:1,requestId:f.requestId(3),reason:'Удаляем тестера после завершённой проверки'});
  assert.equal(remove.control.revision,2);assert.equal(remove.testerCount,0);
  assert.equal((await worldAccessPolicy(f.env,'556677')).allowed,false);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM zeffi_world_control_audit').get().n,2);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM zeffi_world_control_testers').get().n,0);
 }finally{f.close();}
});

test('P0 release mode off denies env testers, signed access remains required',async()=>{
 const f=fixture();try{
  const old=(await f.control('access')).control;
  const saved=await f.control('config/save',f.cBody({...old,release_mode:'off',rollout_percent:0},0,20));
  assert.equal(saved.control.release_mode,'off');
  assert.equal((await worldAccessPolicy(f.env,'12345')).allowed,false);
  const deps={resolvePlayerAuth:async(_r,body)=>body.initData==='signed'?{telegramId:'12345'}:null};
  const req=initData=>new Request('https://world.test/api/world/story-access',{method:'POST',body:JSON.stringify({initData})});
  assert.equal((await handleZeffiWorldApi(req('signed'),f.env,deps)).status,403);
  assert.equal((await handleZeffiWorldApi(req('fake'),f.env,deps)).status,401);
  const envOff={...f.env,WORLD_ENABLED:'false'};
  const response=await handleZeffiWorldApi(req('signed'),envOff,deps);
  assert.equal(response.status,403);assert.equal((await response.json()).code,'WORLD_DISABLED');
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM zeffi_world_cities').get().n,0);
 }finally{f.close();}
});

test('P0 percentage cohort is deterministic and never bypasses Telegram authentication',async()=>{
 const f=fixture();try{
  const a=(await f.control('access')).control;const next={...a,release_mode:'percentage',rollout_percent:13};
  await f.control('config/save',f.cBody(next,0,30));
  const chosen=[];const rejected=[];
  for(let i=20000;i<20200;i++){
   const id=String(i); const access=await worldAccessPolicy(f.env,id);
   assert.equal(access.allowed,worldRolloutBucket(id)<13);
   (access.allowed?chosen:rejected).push(id);
   assert.equal((await worldAccessPolicy(f.env,id)).allowed,access.allowed);
  }
  assert.ok(chosen.length>0&&rejected.length>0);assert.equal((await worldAccessPolicy(f.env,'12345')).allowed,true);
  await assert.rejects(f.control('config/save',f.cBody({...next,release_mode:'all'},0,31)),e=>e.status===409);
 }finally{f.close();}
});

test('P0 runtime switches only restrict existing environment capabilities',async()=>{
 const f=fixture();try{
  const a=(await f.control('access')).control;
  const b={...a,allow_purchases:0,allow_story:0,allow_contributions:0,allow_fund:0,allow_residents:0};
  await f.control('config/save',f.cBody(b,0,40));
  const r=await worldAccessPolicy(f.env,'12345');
  for(const flag of ['WORLD_PURCHASES_ENABLED','WORLD_STORY_ENABLED','WORLD_COMMUNITY_CONTRIBUTIONS_ENABLED','WORLD_COMMUNITY_FUND_ENABLED','WORLD_RESIDENT_REQUESTS_ENABLED'])
   assert.equal(r.effectiveEnv[flag],false);
  const envOff={...f.env,WORLD_PURCHASES_ENABLED:'false'};
  const off=await worldAccessPolicy(envOff,'12345');assert.equal(off.effectiveEnv.WORLD_PURCHASES_ENABLED,false);
  await assert.rejects(f.control('config/save',{...f.cBody({...a,allow_purchases:1},1,41),confirmPhrase:'NO'}),e=>e.status===400);
  assert.equal((await f.control('access')).control.allow_purchases,0);
 }finally{f.close();}
});

test('P0 admin endpoints reject missing owner context and invalid identifiers',async()=>{
 const f=fixture();try{
  await assert.rejects(handleOwnerWorldControl({env:f.env,ctx:{access:{owner:false}},path:'/api/owner/world/overview'}),e=>e.status===403);
  await assert.rejects(f.control('tester/add',{telegramId:'../script',reason:'This is a long reason',expectedRevision:0,requestId:f.requestId(60)}),e=>e.status===400);
  await assert.rejects(f.control('config/save',{...f.cBody((await f.control('access')).control,0,70),confirmPhrase:'NO',control:{release_mode:'all',rollout_percent:100}}),e=>e.status===400);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM zeffi_world_control_audit').get().n,0);
 }finally{f.close();}
});

test('P0 telemetry collects anonymous 409/5xx hourly counters and skips expected denies',async()=>{
 const f=fixture();try{
  assert.equal(await recordWorldControlError(f.db,{path:'/api/world/mutate',status:401,code:'WORLD_UNAUTHORIZED'}),false);
  for(let n=0;n<3;n++)assert.equal(await recordWorldControlError(f.db,{path:'/api/world/mutate',status:409,code:'WORLD_REVISION_CONFLICT'}),true);
  assert.equal(await recordWorldControlError(f.db,{path:'/api/world/community/contribute',status:503,code:'COMMUNITY_SCHEMA_NOT_READY'}),true);
  await recordWorldControlRetry(f.db,{area:'personal'});
  await recordWorldControlRetry(f.db,{area:'personal'});
  await recordWorldControlRetry(f.db,{area:'fund'});
  const result=await f.control('monitor');
  assert.equal(result.health.retries24h,3);
  assert.equal(result.retries.find(x=>x.area==='personal').count,2);
  assert.equal(result.health.unmatchedOperations,0);
  assert.equal(result.health.citiesWithoutProfiles,0);
  assert.equal(result.health.total409,3);assert.equal(result.health.total5xx,1);
  assert.equal(result.errors.length,2);
  assert.ok(result.errors.every(x=>!Object.hasOwn(x,'telegramId')));
 }finally{f.close();}
});

test('P0 metrics use real project/operation rows and do not change the player wallet',async()=>{
 const f=fixture();try{
  const ts=Math.floor(Date.now()/1000);
  f.sql.prepare(`INSERT INTO admin_profile_state(telegram_id,wallet,treats,coffee,revision) VALUES ('12345',2500,15,15,1)`).run();
  f.sql.prepare("INSERT INTO zeffi_world_cities(telegram_id,revision,state_json,created_at,updated_at) VALUES('12345',0,'{}',?,?)").run(ts,ts);
  f.sql.prepare("INSERT INTO zeffi_world_operations(telegram_id,request_id,action_kind,city_revision,cost_points,cost_treats,cost_coffee,created_at,city_guard,profile_guard) VALUES('12345','test-world-stats-request-id','place',1,500,1,0,?,1,1)").run(ts);
  const d=await f.control('overview');
  assert.equal(d.overview.cities,1);assert.equal(d.overview.activeCities24h,1);
  assert.equal(d.overview.operations24h,1);assert.equal(d.overview.costs24h.points,500);
  assert.equal(d.overview.projects.length,2);assert.equal(d.overview.projects[0].total,0);
  assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM zeffi_world_control_audit").get().n,0);
  assert.equal(f.sql.prepare("SELECT wallet FROM admin_profile_state WHERE telegram_id='12345'").get().wallet,2500);
 }finally{f.close();}
});
