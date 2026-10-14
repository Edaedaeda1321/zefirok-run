import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleZeffiWorldApi} from '../../src/zeffi-world-service.js';
import {handleOwnerWorldBalance} from '../../src/zeffi-world-balance-admin.js';
import {publishedWorldEconomy} from '../../src/zeffi-world-balance.js';
import {defaultWorldBalance,validateWorldBalance,createWorldBalanceRuntime} from '../world-balance.js';
import {CATALOG} from '../catalog.js';
import {makeInitialCity,addObject,storeObject,restoreObject,cityStats} from '../engine.js';
const text=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
const p=(name)=>'/api/owner/world/balance'+name;
let rid=0;const requestId=()=>`world-p1-${String(++rid).padStart(15,'0')}`;
function fixture({migration=true}={}){
 const db=new DatabaseSync(':memory:');
 db.exec(`CREATE TABLE admin_profile_state(telegram_id TEXT PRIMARY KEY,wallet INTEGER NOT NULL,treats INTEGER NOT NULL,coffee INTEGER NOT NULL,revision INTEGER NOT NULL,updated_at INTEGER NOT NULL DEFAULT 0,updated_by TEXT NOT NULL DEFAULT '');`);
 db.exec("INSERT INTO admin_profile_state(telegram_id,wallet,treats,coffee,revision) VALUES ('12345',2000000,10000,1000,1)");
 db.exec(text('migrations/0114_zeffi_world.sql'));
 if(migration)db.exec(text('migrations/0121_zeffi_world_balance_p1.sql'));
 class Statement{constructor(sql,args=[]){this.sql=sql;this.args=args;}bind(...args){return new Statement(this.sql,args);}first(){return db.prepare(this.sql).get(...this.args)||null;}
  all(){return {results:db.prepare(this.sql).all(...this.args)};}run(){const r=db.prepare(this.sql).run(...this.args);return {meta:{changes:Number(r.changes)}};}}
 const DB={prepare:sql=>new Statement(sql),async batch(stmts){db.exec('BEGIN IMMEDIATE');try{const results=stmts.map(s=>s.run());db.exec('COMMIT');return results;}
   catch(e){db.exec('ROLLBACK');throw e;}}};
 const env={DB,WORLD_ENABLED:'true',WORLD_TESTER_IDS:'12345',WORLD_PURCHASES_ENABLED:'true',WORLD_RESIDENT_REQUESTS_ENABLED:'false'};
 const deps={resolvePlayerAuth:async(_req,body)=>body.initData==='signed'?{telegramId:'12345'}:null,
  ensureAuthoritativeProfileRow:async (_env,id)=>DB.prepare('SELECT * FROM admin_profile_state WHERE telegram_id=?').bind(id).first(),
  requirePlayerOperationAvailable:async()=>true};
 const admin=async(path,body={},owner=true)=>handleOwnerWorldBalance({env,ctx:{user:{id:'12345'},access:{owner},body},path:p(path)});
 const world=async(path,body={})=>{const res=await handleZeffiWorldApi(new Request('https://example.test/api/world/'+path,{method:'POST',body:JSON.stringify({initData:'signed',...body})}),env,deps);
  return {status:res.status,...await res.json()};};
 const wallet=()=>db.prepare('SELECT wallet,treats,coffee,revision FROM admin_profile_state WHERE telegram_id=?').get('12345');
 const receipts=()=>db.prepare('SELECT COUNT(*) AS n FROM zeffi_world_operations').get().n;
 return {db,DB,env,deps,admin,world,wallet,receipts};
}
const changePrice=s=>{const next=structuredClone(s);next.items.cottage.price.points+=153;return next;};
const mutArgs=(kind,x=17,y=18)=>({kind:'place',args:{objectKind:kind,x,y,rotation:0}});

test('P1 default catalogue is unchanged and full 24x24 city remains reachable',()=>{
 const d=validateWorldBalance(defaultWorldBalance());const runtime=createWorldBalanceRuntime(d);
 assert.equal(d.levels.length,10);assert.equal(Object.keys(d.items).length,Object.keys(defaultWorldBalance().items).length);
 assert.equal(runtime.catalog.cottage.minCityLevel,CATALOG.cottage.minCityLevel);
 assert.equal(runtime.catalog.cottage.price.points,CATALOG.cottage.price.points);
 assert.equal(cityStats(makeInitialCity(),runtime.catalog).cityLevel,1);
 assert.equal(runtime.catalog.__cityLevels[9].level,10);
});
test('P1 rejects unsupported items, missing starter buildings, unsafe prices and impossible growth',()=>{
 for(const corrupt of [
  x=>{x.items.fake={minCityLevel:1,price:{points:1,treats:0,coffee:0}};},
  x=>{x.items.cottage.minCityLevel=4;},
  x=>{x.items.cottage.price.coffee=1;},
  x=>{x.levels[3].residents=x.levels[2].residents;},
  x=>{x.levels[9].residents=150;x.levels[9].comfort=1100;}
 ]){const c=defaultWorldBalance();corrupt(c);assert.throws(()=>validateWorldBalance(c),/WORLD_BALANCE_INVALID/);}
});
test('P1 owner-only editing, audited draft and publication leave wallet intact',async()=>{
 const f=fixture(),before=f.wallet();
 const read=await f.admin('');assert.equal(read.draftRevision,0);assert.equal(read.publishedRevision,0);assert.equal(read.hasPendingChanges,false);
 await assert.rejects(()=>f.admin('',{},false),e=>e.status===403);
 const edited=changePrice(read.draft);const id=requestId();
 const saved=await f.admin('/draft/save',{balance:edited,expectedRevision:0,requestId:id,reason:'Тест P1: меняем стоимость раннего домика'});
 assert.equal(saved.draftRevision,1);assert.equal(saved.publishedRevision,0);assert.equal(saved.hasPendingChanges,true);
 assert.equal(saved.published.items.cottage.price.points,CATALOG.cottage.price.points);
 const replay=await f.admin('/draft/save',{balance:edited,expectedRevision:0,requestId:id,reason:'Тест P1: меняем стоимость раннего домика'});
 assert.equal(replay.repeated,true);assert.equal(f.wallet().wallet,before.wallet);
 await assert.rejects(()=>f.admin('/publish',{expectedRevision:1,requestId:requestId(),reason:'Подтверждаем новый баланс без фразы'}),e=>e.status===400);
 const published=await f.admin('/publish',{expectedRevision:1,requestId:requestId(),reason:'Тест P1: выпускаем валидную новую цену',confirmPhrase:'ОПУБЛИКОВАТЬ БАЛАНС'});
 assert.equal(published.publishedRevision,1);assert.equal(published.published.items.cottage.price.points,edited.items.cottage.price.points);
 assert.equal(published.hasPendingChanges,false);
 assert.deepEqual(f.wallet(),before);
 assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM zeffi_world_balance_audit').get().n,2);
});
test('P1 signed World state and purchased quote use ONLY published catalogue; stale price cannot debit',async()=>{
 const f=fixture(),initial=await f.world('state');
 assert.equal(initial.status,200);assert.equal(initial.economy.revision,0);
 const next=changePrice(defaultWorldBalance());
 await f.admin('/draft/save',{balance:next,expectedRevision:0,requestId:requestId(),reason:'Серверный тест безопасной смены цены'});
 const draftState=await f.world('state');assert.equal(draftState.economy.items.cottage.price.points,CATALOG.cottage.price.points);
 await f.admin('/publish',{expectedRevision:1,requestId:requestId(),reason:'Публикация тестовой стоимости домика',confirmPhrase:'ОПУБЛИКОВАТЬ БАЛАНС'});
 const active=await f.world('state');assert.equal(active.economy.revision,1);
 assert.equal(active.economy.items.cottage.price.points,CATALOG.cottage.price.points+153);
 const before=f.wallet(),attempt=await f.world('mutate',{requestId:requestId(),expectedRevision:active.revision,expectedPrice:CATALOG.cottage.price,action:mutArgs('cottage')});
 assert.equal(attempt.status,409);assert.equal(attempt.code,'WORLD_PRICE_CHANGED');assert.deepEqual(f.wallet(),before);assert.equal(f.receipts(),0);
 const correct=await f.world('mutate',{requestId:requestId(),expectedRevision:active.revision,expectedPrice:next.items.cottage.price,action:mutArgs('cottage')});
 assert.equal(correct.status,200,correct.error);assert.equal(f.wallet().wallet,before.wallet-next.items.cottage.price.points);
 assert.equal(correct.economy.revision,1);assert.equal(correct.city.objects.length,initial.city.objects.length+1);
});
test('P1 published level thresholds affect client-visible stats and preserve owned buildings',async()=>{
 const f=fixture();let x=defaultWorldBalance();x.levels[9].residents=68;
 // Lowering max condition remains monotonic and locally achievable.
 const s=await f.admin('/draft/save',{balance:x,requestId:requestId(),expectedRevision:0,reason:'Проверяем снижение требования 10 уровня'});
 const a=await f.admin('/publish',{requestId:requestId(),expectedRevision:s.draftRevision,reason:'Проверяем новое требование десятого уровня',confirmPhrase:'ОПУБЛИКОВАТЬ БАЛАНС'});
 assert.equal(a.published.levels[9].residents,68);
 const econ=await publishedWorldEconomy(f.DB);assert.equal(econ.catalog.__cityLevels[9].residents,68);
 let c=makeInitialCity();c.progress.bestLevel=10;c.wallet={points:400000,treats:1000,coffee:100};
 c=addObject(c,econ.catalog,'white-rabbit-zephirok',17,18,0,Date.now());const id=c.objects.at(-1).uid;
 const spent={...c.wallet};c.progress.bestLevel=1;c=storeObject(c,id);c=restoreObject(c,econ.catalog,id,17,18,0);
 assert.deepEqual(c.wallet,spent);
});
test('P1 claimed reward cannot be repriced; no duplicate claims or wallet changes',async()=>{
 const f=fixture(),city=makeInitialCity();city.progress.bestLevel=10;city.progress.claimedLevels=[2];
 f.db.prepare('INSERT INTO zeffi_world_cities(telegram_id,revision,state_json,last_request_id,created_at,updated_at) VALUES (?,?,?,?,?,?)').run('12345',0,JSON.stringify(city),'',1,1);
 const spec=defaultWorldBalance();spec.levels[1].reward.points+=100;
 const draft=await f.admin('/draft/save',{balance:spec,expectedRevision:0,requestId:requestId(),reason:'Проверяем заморозку уже выданной награды'});
 const before=f.wallet();await assert.rejects(()=>f.admin('/publish',{expectedRevision:draft.draftRevision,requestId:requestId(),reason:'Пробуем изменить ранее выданную награду',confirmPhrase:'ОПУБЛИКОВАТЬ БАЛАНС'}),e=>e.status===409&&e.message.includes('уровень 2'));
 assert.deepEqual(f.wallet(),before);assert.equal((await f.admin('')).publishedRevision,0);
});
test('P1 last-moment claimed reward blocks publication in the SAME D1 transaction',async()=>{
 const f=fixture(),next=defaultWorldBalance();next.levels[1].reward.points+=200;
 const saved=await f.admin('/draft/save',{balance:next,expectedRevision:0,requestId:requestId(),reason:'Проверка конкурирующей выдачи награды 2 уровня'});
 const before=f.wallet();const originalBatch=f.DB.batch.bind(f.DB);
 f.DB.batch=async statements=>{
  // A real player claim can commit AFTER preflight and BEFORE publish batch.
  const city=makeInitialCity();city.progress.bestLevel=2;city.progress.claimedLevels=[2];
  f.db.prepare('INSERT INTO zeffi_world_cities(telegram_id,revision,state_json,last_request_id,created_at,updated_at) VALUES (?,?,?,?,?,?)')
   .run('99999',0,JSON.stringify(city),'',1,1);
  return originalBatch(statements);
 };
 await assert.rejects(()=>f.admin('/publish',{expectedRevision:saved.draftRevision,requestId:requestId(),reason:'Нельзя поменять только что выданную награду',confirmPhrase:'ОПУБЛИКОВАТЬ БАЛАНС'}),e=>e.status===409);
 assert.equal((await f.admin('')).publishedRevision,0);
 assert.deepEqual(f.wallet(),before);
 assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM zeffi_world_balance_audit').get().n,1);
});
test('P1 concurrent owner saves cannot bypass revision or receipt atomicity',async()=>{
 const f=fixture(),x=changePrice(defaultWorldBalance());
 await f.admin('/draft/save',{balance:x,requestId:requestId(),expectedRevision:0,reason:'Проверка первой ревизии черновика'});
 await assert.rejects(()=>f.admin('/draft/save',{balance:x,requestId:requestId(),expectedRevision:0,reason:'Попытка сохранить старую ревизию снова'}),e=>e.status===409);
 assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM zeffi_world_balance_audit').get().n,1);
});
test('P1 missing optional 0121 keeps old World gameplay but admin editor fails closed',async()=>{
 const f=fixture({migration:false}),state=await f.world('state');
 assert.equal(state.status,200);assert.equal(state.economy.revision,0);
 const before=f.wallet();await assert.rejects(()=>f.admin(''),e=>e.status===503);
 const paid=await f.world('mutate',{requestId:requestId(),expectedRevision:state.revision,expectedPrice:CATALOG.cottage.price,action:mutArgs('cottage')});
 assert.equal(paid.status,200,paid.error);assert.equal(f.wallet().wallet,before.wallet-CATALOG.cottage.price.points);
});
test('P1 malformed published balance fails closed, preserving profiles and operation receipts',async()=>{
 const f=fixture();f.db.prepare('UPDATE zeffi_world_balance_config SET published_json=? WHERE id=1').run('{"broken":true}');
 const before=f.wallet(),state=await f.world('state');assert.equal(state.status,503);assert.deepEqual(f.wallet(),before);assert.equal(f.receipts(),0);
});
