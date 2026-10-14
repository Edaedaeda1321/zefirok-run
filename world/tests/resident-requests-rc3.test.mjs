import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleZeffiWorldApi} from '../../src/zeffi-world-service.js';
import {addObject,checkPlacement,cityStats,makeInitialCity,connectedRoads,isObjectConnected} from '../engine.js';
import {CATALOG} from '../catalog.js';
import {RESIDENT_TEMPLATES,RESIDENT_DAILY_CLAIM_LIMIT,claimResidentRequest} from '../../src/zeffi-resident-requests.js';

function fixture(){
 const db=new DatabaseSync(':memory:');
 db.exec(`CREATE TABLE admin_profile_state (
  telegram_id TEXT PRIMARY KEY,wallet INTEGER NOT NULL,coffee INTEGER NOT NULL,treats INTEGER NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,updated_at INTEGER,updated_by TEXT DEFAULT '');`);
 db.exec("INSERT INTO admin_profile_state VALUES ('12345',200000,500,1000,0,0,''),('67890',200000,500,1000,0,0,'')");
 for(const migration of ['0114_zeffi_world.sql','0119_zeffi_world_resident_requests.sql']){
  db.exec(readFileSync(new URL(`../../migrations/${migration}`,import.meta.url),'utf8'));
 }
 const prepared=sql=>({
  all:async()=>({results:db.prepare(sql).all()}),
  first:async()=>db.prepare(sql).get()??null,
  run:async()=>{const r=db.prepare(sql).run();return {meta:{changes:Number(r.changes)}};},
  bind(...args){const s=db.prepare(sql);return{
   all:async()=>({results:s.all(...args)}),
   first:async()=>s.get(...args)??null,
   run:async()=>{const r=s.run(...args);return {meta:{changes:Number(r.changes)}};}
  };}
 });
 const adapter={prepare:prepared,async batch(stmts){
  db.exec('BEGIN TRANSACTION;');
  try{const result=[];for(const st of stmts)result.push(await st.run());db.exec('COMMIT;');return result;}
  catch(error){db.exec('ROLLBACK;');throw error;}
 }};
 const env={DB:adapter,WORLD_ENABLED:'true',WORLD_TESTER_IDS:'12345,67890',WORLD_PURCHASES_ENABLED:'true'};
 const deps={
  resolvePlayerAuth:async(_req,b)=>b?.initData==='signed'?{telegramId:b?.asUser||'12345'}:null,
  ensureAuthoritativeProfileRow:async(_env,id)=>db.prepare('SELECT * FROM admin_profile_state WHERE telegram_id=?').get(id),
  requirePlayerOperationAvailable:async()=>true
 };
 async function call(path='state',body={},opt={}){
  const url=`https://zeffi.test/api/world/${path}`;
  const r=await handleZeffiWorldApi(new Request(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({initData:'signed',...body})}),{...env,...opt},deps);
  return {status:r.status,body:await r.json()};
 }
 const wallet=id=>db.prepare('SELECT wallet,treats,coffee,revision FROM admin_profile_state WHERE telegram_id=?').get(id);
 const stored=()=>db.prepare('SELECT state_json,revision FROM zeffi_world_cities WHERE telegram_id=?').get('12345');
 const receipts=()=>db.prepare('SELECT * FROM zeffi_world_resident_claim_receipts ORDER BY claim_request_id').all();
 const ledger=()=>db.prepare('SELECT * FROM zeffi_world_resident_requests ORDER BY assigned_at').all();
 const mutate=async(action,requestId='test-request-00000001')=>{
  const initial=await call('state');
  let quote={points:0,treats:0,coffee:0};
  if(action.kind==='place')quote={...CATALOG[action.args.objectKind].price};
  if(action.kind==='road')quote={points:action.args.positions.length*50,treats:0,coffee:0};
  return call('mutate',{requestId,expectedRevision:initial.body.revision,expectedPrice:quote,action});
 };
 return {db,adapter,env,call,wallet,stored,mutate,receipts,ledger};
}
function freeSpot(city,kind){
 for(let x=3;x<23;x++)for(let y=3;y<23;y++)if(checkPlacement(city,CATALOG,kind,x,y,0).ok)return {x,y};
 throw Error(`No free spot for ${kind}`);
}

test('0119 schema and two active personalized requests; isolated users and no rewards on state',async()=>{
 const f=fixture(),before=f.wallet('12345');
 const r=await f.call();assert.equal(r.status,200);
 assert.equal(r.body.residentRequests.enabled,true);
 assert.equal(r.body.residentRequests.requests.length,2);
 assert.deepEqual(r.body.residentRequests.requests.map(x=>x.templateId),['flowers','park']);
 assert.equal(r.body.residentRequests.daily.claimed,0);
 assert.deepEqual(f.wallet('12345'),before);
 const other=await f.call('state',{asUser:'67890'});
 assert.equal(other.body.residentRequests.requests.length,2);
 assert.equal(f.ledger().length,4);
 f.db.close();
});
test('first paid flowerbed commits a ready request; moving/storing and replay do not mint additional rewards',async()=>{
 const f=fixture(),s=(await f.call()).body,spot=freeSpot(s.city,'flowerbed');
 const pay=await f.mutate({kind:'place',args:{objectKind:'flowerbed',...spot,rotation:0}});
 assert.equal(pay.status,200,JSON.stringify(pay.body));
 assert.equal(pay.body.residentRequests.requests.find(r=>r.templateId==='flowers').status,'ready');
 assert.equal(f.wallet('12345').wallet,200000-CATALOG.flowerbed.price.points);
 const replay=await f.call('mutate',{requestId:'test-request-00000001',action:{kind:'place',args:{objectKind:'flowerbed',...spot,rotation:0}},expectedRevision:s.revision,expectedPrice:CATALOG.flowerbed.price});
 assert.equal(replay.status,200);assert.equal(replay.body.repeated,true);
 assert.equal(f.wallet('12345').wallet,200000-CATALOG.flowerbed.price.points);
 const wrong=await f.call('resident/claim',{residentRequestId:'resident-park',requestId:'claim-park-0000001'});
 assert.equal(wrong.status,409);assert.equal(f.receipts().length,0);
 const ok=await f.call('resident/claim',{residentRequestId:'resident-flowers',requestId:'claim-flower-000001',reward:{points:999999999}});
 assert.equal(ok.status,200,JSON.stringify(ok.body));assert.equal(ok.body.reward.points,100);
 assert.equal(f.wallet('12345').wallet,200000-350+100);
 const twice=await f.call('resident/claim',{residentRequestId:'resident-flowers',requestId:'claim-flower-000002'});
 assert.equal(twice.status,200);assert.equal(twice.body.repeated,true);
 assert.equal(f.receipts().length,1);assert.equal(f.wallet('12345').wallet,200000-350+100);
 f.db.close();
});
test('daily limit cannot pay third reward even with forged request/body; next day permits claim',async()=>{
 const f=fixture();await f.call();
 // Mark two requests ready using a fixture (equivalent to verified server events).
 f.db.prepare("UPDATE zeffi_world_resident_requests SET status='ready', progress=1 WHERE telegram_id='12345'").run();
 const a=await f.call('resident/claim',{residentRequestId:'resident-flowers',requestId:'claim-limit-first-0001'});
 const b=await f.call('resident/claim',{residentRequestId:'resident-park',requestId:'claim-limit-second-0001'});
 assert.equal(a.status,200);assert.equal(b.status,200);
 const after=await f.call();assert.equal(after.body.residentRequests.daily.claimed,2);
 const pending=after.body.residentRequests.requests[0];assert.ok(pending);
 f.db.prepare("UPDATE zeffi_world_resident_requests SET status='ready',progress=1 WHERE telegram_id=? AND request_id=?").run('12345',pending.id);
 const third=await f.call('resident/claim',{residentRequestId:pending.id,requestId:'claim-limit-third-0001'});
 assert.equal(third.status,429);assert.equal(f.receipts().length,2);
 const count=f.db.prepare("SELECT claims FROM zeffi_world_resident_daily_claims WHERE telegram_id='12345'").get().claims;
 assert.equal(count,2);
 const tomorrow=Date.now()+26*60*60*1000;
 const allowed=await claimResidentRequest({db:f.adapter,telegramId:'12345',requestId:pending.id,
  claimRequestId:'claim-tomorrow-00001',now:tomorrow,operationGate:async()=>{},
  readProfile:async id=>f.db.prepare('SELECT * FROM admin_profile_state WHERE telegram_id=?').get(id)});
 assert.equal(allowed.status,200);
 assert.equal(f.receipts().length,3);
 f.db.close();
});
test('unsigned/outsider/World disabled cannot create requests, claim or credit balances',async()=>{
 const f=fixture(),before=f.wallet('12345');
 assert.equal((await f.call('state',{initData:'forged'})).status,401);
 assert.equal((await f.call('state',{asUser:'99999'})).status,403);
 assert.equal((await f.call('state',{}, {WORLD_ENABLED:'false'})).status,403);
 assert.equal(f.ledger().length,0);
 assert.deepEqual(f.wallet('12345'),before);
 f.db.close();
});
test('RC-3 claim checks profile optimistic revision and fails atomically',async()=>{
 const f=fixture();await f.call();
 f.db.prepare("UPDATE zeffi_world_resident_requests SET status='ready',progress=1 WHERE telegram_id='12345' AND template_id='flowers'").run();
 const oldWallet=f.wallet('12345');
 // Profile revision becomes stale between read and wallet CAS.
 const depsErr=async()=>{};
 const original=f.adapter.batch;
 f.adapter.batch=async(stmts)=>{
  f.db.prepare('UPDATE admin_profile_state SET revision=revision+1 WHERE telegram_id=?').run('12345');
  return original(stmts);
 };
 const r=await f.call('resident/claim',{residentRequestId:'resident-flowers',requestId:'claim-stale-profile-01'});
 assert.equal(r.status,409);assert.equal(f.receipts().length,0);
 assert.equal(f.wallet('12345').wallet,oldWallet.wallet);
 assert.equal(f.db.prepare("SELECT status FROM zeffi_world_resident_requests WHERE telegram_id='12345' AND template_id='flowers'").get().status,'ready');
 f.db.close();
});
test('missing optional 0119 schema leaves existing paid World construction working, but disables RC-3',async()=>{
 const f=fixture();f.db.exec('DROP TABLE zeffi_world_resident_requests;');
 const s=await f.call();assert.equal(s.status,200);
 assert.equal(s.body.residentRequests.enabled,false);
 const spot=freeSpot(s.body.city,'flowerbed');
 const r=await f.mutate({kind:'place',args:{objectKind:'flowerbed',...spot,rotation:0}},'without-residents-0001');
 assert.equal(r.status,200);
 assert.equal(f.wallet('12345').wallet,200000-350);
 assert.equal((await f.call('resident/claim',{residentRequestId:'resident-flowers',requestId:'claim-without-schema'})).status,503);
 f.db.close();
});
test('source safety: no client-controlled rewards or Wallet update in frontend',()=>{
 const source=readFileSync(new URL('../resident-requests-ui.js',import.meta.url),'utf8');
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const handler=readFileSync(new URL('../../src/zeffi-resident-requests.js',import.meta.url),'utf8');
 assert.match(app,/serverRequest\('resident\/claim'/);
 assert.match(handler,/profile_guard/);
 assert.doesNotMatch(source,/fetch\(|querySelector\('#confirmEdit'\)|localStorage/);
 assert.equal(RESIDENT_TEMPLATES.length,6);
 assert.equal(RESIDENT_DAILY_CLAIM_LIMIT,2);
});
