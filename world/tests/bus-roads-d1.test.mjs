import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleZeffiWorldApi} from '../../src/zeffi-world-service.js';
const ZERO={points:0,treats:0,coffee:0};

test('bus roads: signed D1 mutations protect wallet, CAS, retries and release switches',async t=>{
 const db=new DatabaseSync(':memory:');
 db.exec(`CREATE TABLE admin_profile_state(telegram_id TEXT PRIMARY KEY,wallet INTEGER NOT NULL,treats INTEGER NOT NULL,coffee INTEGER NOT NULL,revision INTEGER NOT NULL,updated_at INTEGER NOT NULL DEFAULT 0,updated_by TEXT NOT NULL DEFAULT '');`);
 db.exec(readFileSync(new URL('../../migrations/0114_zeffi_world.sql',import.meta.url),'utf8'));
 db.prepare('INSERT INTO admin_profile_state (telegram_id,wallet,treats,coffee,revision) VALUES (?,?,?,?,1)').run('123456789',50000,100,100);
 class Query{
  constructor(sql,args=[]){this.sql=sql;this.args=args;}
  bind(...args){return new Query(this.sql,args);}
  first(){return db.prepare(this.sql).get(...this.args)||null;}
  all(){return {results:db.prepare(this.sql).all(...this.args)};}
  run(){const r=db.prepare(this.sql).run(...this.args);return {meta:{changes:Number(r.changes)}};}
 }
 const driver={prepare(sql){return new Query(sql)},async batch(stmts){
  db.exec('BEGIN IMMEDIATE');try{const results=stmts.map(s=>s.run());db.exec('COMMIT');return results;}
  catch(e){db.exec('ROLLBACK');throw e;}
 }};
 const env={DB:driver,WORLD_ENABLED:'true',WORLD_TESTER_IDS:'123456789',WORLD_PURCHASES_ENABLED:'true'};
 const deps={resolvePlayerAuth:async(_r,b)=>b.initData==='signed-player'?{telegramId:'123456789'}:null,
  ensureAuthoritativeProfileRow:async(_env,id)=>driver.prepare('SELECT * FROM admin_profile_state WHERE telegram_id=?').bind(id).first(),
  requirePlayerOperationAvailable:async()=>true};
 const request=async (endpoint,body={},customEnv=env)=>{
  const response=await handleZeffiWorldApi(new Request('https://world.test/api/world/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData:'signed-player',...body})}),customEnv,deps);
  return {status:response.status,...await response.json()};
 };
 const wallet=()=>db.prepare('SELECT wallet,treats,coffee,revision FROM admin_profile_state WHERE telegram_id=?').get('123456789');
 const receipts=()=>db.prepare('SELECT COUNT(*) AS n FROM zeffi_world_operations').get().n;
 let state=await request('state');
 assert.equal(state.status,200,state.error);
 const savedBefore=JSON.stringify(state.city);
 const paid=async(kind,positions,price,requestId,expectedRevision=state.revision,customEnv=env)=>request('mutate',{requestId,expectedRevision,expectedPrice:price,action:{kind,args:{positions}}},customEnv);
 await t.test('free conversion of existing Road persists without wallet updates',async()=>{
  const before=wallet(),n=receipts();
  const result=await paid('bus-road',[{x:10,y:13},{x:11,y:13}],ZERO,'bus-lanes-free-12345678');
  assert.equal(result.status,200,result.error);assert.deepEqual(result.city.busRoads,['10,13','11,13']);
  assert.equal(wallet().wallet,before.wallet);assert.equal(wallet().revision,before.revision,'no unnecessary wallet CAS');
  assert.equal(receipts(),n+1);state=result;
  assert.equal(savedBefore.includes('busRoads'),false);
 });
 await t.test('repeating confirmed request costs nothing and does not duplicate lanes',async()=>{
  const before=wallet(),n=receipts();
  const replay=await paid('bus-road',[{x:10,y:13},{x:11,y:13}],ZERO,'bus-lanes-free-12345678',0);
  assert.equal(replay.status,200,replay.error);assert.equal(replay.repeated,true);
  assert.equal(replay.revision,state.revision);assert.deepEqual(wallet(),before);assert.equal(receipts(),n);
 });
 await t.test('new Road + bus asphalt costs exactly 50 points per new tile',async()=>{
  const before=wallet();const result=await paid('bus-road',[{x:16,y:13},{x:17,y:13}],{points:100,treats:0,coffee:0},'bus-lanes-paid-12345678');
  assert.equal(result.status,200,result.error);
  assert.equal(wallet().wallet,before.wallet-100);assert.deepEqual(result.city.busRoads.slice(-2),['16,13','17,13']);
  assert.ok(result.city.roads.includes('16,13'));state=result;
 });
 await t.test('client cannot underquote new asphalt or reuse a stale revision',async()=>{
  const before=wallet(),n=receipts();
  const quote=await paid('bus-road',[{x:18,y:13}],ZERO,'bus-quote-wrong-12345678');
  assert.equal(quote.status,409);assert.equal(quote.code,'WORLD_PRICE_CHANGED');
  const stale=await paid('bus-road',[{x:18,y:13}],{points:50,treats:0,coffee:0},'bus-revision-stale-1234',state.revision-1);
  assert.equal(stale.status,409);assert.deepEqual(wallet(),before);assert.equal(receipts(),n);
 });
 await t.test('disabled purchases block zero-cost marking of already owned roads',async()=>{
  const before=wallet(),n=receipts();
  const result=await paid('bus-road',[{x:12,y:13}],ZERO,'bus-gate-disabled-123456',state.revision,{...env,WORLD_PURCHASES_ENABLED:'false'});
  assert.equal(result.status,403);assert.equal(result.code,'WORLD_PURCHASES_DISABLED');assert.deepEqual(wallet(),before);assert.equal(receipts(),n);
 });
 await t.test('removing bus marking is free and preserves the ordinary road',async()=>{
  const before=wallet();const result=await paid('erase-bus-road',[{x:10,y:13}],ZERO,'bus-erase-marking-123456');
  assert.equal(result.status,200,result.error);assert.ok(!result.city.busRoads.includes('10,13'));
  assert.ok(result.city.roads.includes('10,13'));assert.deepEqual(wallet(),before);state=result;
 });
 await t.test('deleting a normal Road tile also cleans up its bus marking',async()=>{
  const before=wallet();const result=await paid('erase-road',[{x:17,y:13}],ZERO,'bus-erase-road-12345678');
  assert.equal(result.status,200,result.error);assert.ok(!result.city.roads.includes('17,13'));
  assert.ok(!result.city.busRoads.includes('17,13'));assert.deepEqual(wallet(),before);state=result;
 });
 await t.test('persisted city reloads valid bus roads unchanged',async()=>{
  const reloaded=await request('state');assert.equal(reloaded.status,200);assert.deepEqual(reloaded.city.busRoads,state.city.busRoads);
 });
 db.close();
});
