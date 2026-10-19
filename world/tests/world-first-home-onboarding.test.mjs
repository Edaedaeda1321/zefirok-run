import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {handleZeffiWorldApi} from '../../src/zeffi-world-service.js';
import {makeInitialCity,constructionSkipPrice} from '../engine.js';
const read=path=>readFileSync(new URL(`../../${path}`,import.meta.url),'utf8');
const ZERO={points:0,coffee:0,treats:0};

test('new World cities must build a paid cottage and get exactly one transactional 0-coffee finish',async t=>{
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE admin_profile_state(telegram_id TEXT PRIMARY KEY,wallet INTEGER NOT NULL,treats INTEGER NOT NULL,coffee INTEGER NOT NULL,revision INTEGER NOT NULL,updated_at INTEGER DEFAULT 0,updated_by TEXT DEFAULT \'\');');
 for(const file of ['0114_zeffi_world.sql','0117_zeffi_world_tutorial.sql','0126_zeffi_world_tutorial_first_home.sql'])db.exec(read(`migrations/${file}`));
 const fresh='123456789',legacy='987654321';
 for(const user of [fresh,legacy])db.prepare('INSERT INTO admin_profile_state(telegram_id,wallet,treats,coffee,revision) VALUES (?,?,?,?,1)').run(user,80000,100,500);
 db.prepare('INSERT INTO zeffi_world_cities(telegram_id,state_json,created_at,updated_at) VALUES(?,?,?,?)').run(legacy,JSON.stringify(makeInitialCity()),Date.now()-86400000,Date.now()-86400000);
 class Query {
  constructor(sql,args=[]){this.sql=sql;this.args=args;}
  bind(...args){return new Query(this.sql,args);}
  first(){return db.prepare(this.sql).get(...this.args)||null;}
  all(){return {results:db.prepare(this.sql).all(...this.args)};}
  run(){const r=db.prepare(this.sql).run(...this.args);return {meta:{changes:Number(r.changes)}};}
 }
 const driver={prepare(sql){return new Query(sql)},async batch(stmts){db.exec('BEGIN IMMEDIATE');try{const r=stmts.map(s=>s.run());db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}};
 const env={DB:driver,WORLD_ENABLED:'true',WORLD_TESTER_IDS:`${fresh},${legacy}`,WORLD_PURCHASES_ENABLED:'true'};
 const deps={
  resolvePlayerAuth:async(_r,body)=>body.initData==='signed'&&[fresh,legacy].includes(body.userId)?{telegramId:body.userId}:null,
  ensureAuthoritativeProfileRow:async(_env,id)=>driver.prepare('SELECT * FROM admin_profile_state WHERE telegram_id=?').bind(id).first(),
  requirePlayerOperationAvailable:async()=>true
 };
 const req=async (user,path,body={},environment=env)=>{
  const response=await handleZeffiWorldApi(new Request('https://rc.test/api/world/'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({initData:'signed',userId:user,...body})}),environment,deps);
  return {status:response.status,...await response.json()};
 };
 const wallet=(id)=>db.prepare('SELECT wallet,coffee,revision FROM admin_profile_state WHERE telegram_id=?').get(id);
 const receipts=()=>db.prepare('SELECT COUNT(*) as n FROM zeffi_world_operations').get().n;
 const action=(s,kind,args,price,id)=>({requestId:id,expectedRevision:s.revision,expectedPrice:price,action:{kind,args}});
 let freshState=await req(fresh,'state');
 await t.test('pre-deployment cities are grandfathered, newly created city requires onboarding',async()=>{
  const old=await req(legacy,'state');assert.equal(old.status,200);assert.equal(old.onboarding.required,false);
  assert.equal(freshState.status,200);assert.equal(freshState.onboarding.required,true);assert.equal(freshState.onboarding.homeUid,'');
  assert.equal(freshState.city.objects.find(x=>x.uid==='obj-1').kind,'cottage','existing city starter is preserved');
 });
 await t.test('fake progress and jump past home purchase are rejected',async()=>{
  assert.equal((await req(fresh,'tutorial',{op:'progress',mode:'personal',step:6})).status,409);
  for(let i=1;i<=4;i++)assert.equal((await req(fresh,'tutorial',{op:'progress',mode:'personal',step:i})).status,200);
  assert.equal((await req(fresh,'tutorial',{op:'progress',mode:'personal',step:5})).status,409);
  assert.equal((await req(fresh,'tutorial',{op:'read'})).tutorial.personal,4);
 });
 await t.test('first paid home keeps points debit and registers only that UID atomically',async()=>{
  const before=wallet(fresh),n=receipts();
  const p={points:5500,treats:0,coffee:0};
  const bad=await req(fresh,'mutate',action(freshState,'place',{objectKind:'cottage',x:17,y:18,rotation:0},ZERO,'onboarding-underquote-12345'));
  assert.equal(bad.status,409);assert.deepEqual(wallet(fresh),before);assert.equal(receipts(),n);
  const response=await req(fresh,'mutate',action(freshState,'place',{objectKind:'cottage',x:17,y:18,rotation:0},p,'onboarding-buy-123456789'));
  assert.equal(response.status,200,response.error);freshState=response;
  const house=response.city.objects.at(-1);
  assert.equal(house.kind,'cottage');assert.equal(response.onboarding.homeUid,house.uid);
  assert.equal(response.onboarding.freeSkipUsed,false);
  assert.equal(wallet(fresh).wallet,before.wallet-5500);assert.equal(wallet(fresh).coffee,before.coffee);
  assert.equal(receipts(),n+1);
  assert.equal((await req(fresh,'tutorial',{op:'progress',mode:'personal',step:5})).status,200);
  assert.equal((await req(fresh,'tutorial',{op:'progress',mode:'personal',step:6})).status,409);
 });
 await t.test('free accelerator requires exact authoritative UID and 0 coffee quote; no wallet touch',async()=>{
  const uid=freshState.onboarding.homeUid,before=wallet(fresh),n=receipts();
  const bad=await req(fresh,'mutate',action(freshState,'skip',{uid},{points:0,treats:0,coffee:70},'onboarding-incorrect-quote'));
  assert.equal(bad.status,409);assert.deepEqual(wallet(fresh),before);assert.equal(receipts(),n);
  const wrong=await req(fresh,'mutate',action(freshState,'skip',{uid:'obj-1'},ZERO,'onboarding-wrong-uid-1234'));
  assert.equal(wrong.status,400);assert.equal(receipts(),n);
  const completed=await req(fresh,'mutate',action(freshState,'skip',{uid},ZERO,'onboarding-free-skip-123'));
  assert.equal(completed.status,200,completed.error);assert.deepEqual(completed.cost,ZERO);assert.equal(completed.onboarding.freeSkipUsed,true);
  assert.equal(completed.city.objects.find(o=>o.uid===uid).buildReadyAt,0);
  assert.deepEqual(wallet(fresh),before,'the free skip changes no wallet values or revision');assert.equal(receipts(),n+1);freshState=completed;
  assert.equal((await req(fresh,'tutorial',{op:'progress',mode:'personal',step:6})).status,200);
  const repeated=await req(fresh,'mutate',action({...freshState,revision:freshState.revision-1},'skip',{uid},ZERO,'onboarding-free-skip-123'));
  assert.equal(repeated.status,200);assert.equal(repeated.repeated,true);assert.equal(receipts(),n+1);assert.deepEqual(wallet(fresh),before);
 });
 await t.test('subsequent home skips cost normal coffee; replay and stale revisions cannot claim gift again',async()=>{
  const pos={objectKind:'cottage',x:20,y:18,rotation:0};
  const build=await req(fresh,'mutate',action(freshState,'place',pos,{points:5500,coffee:0,treats:0},'onboarding-home-second-12'));
  assert.equal(build.status,200,build.error);freshState=build;
  assert.equal(build.onboarding.homeUid,'obj-5');
  const uid=build.city.objects.at(-1).uid,before=wallet(fresh);
  const forged=await req(fresh,'mutate',action(build,'skip',{uid},ZERO,'onboarding-second-free-123'));
  assert.equal(forged.status,409);assert.equal(forged.code,'WORLD_PRICE_CHANGED');assert.deepEqual(wallet(fresh),before);
  const price=constructionSkipPrice(build.city.objects.at(-1));
  const paid=await req(fresh,'mutate',action(build,'skip',{uid},{points:0,treats:0,coffee:price.coffee},'onboarding-second-paid-123'));
  assert.equal(paid.status,200,paid.error);assert.equal(paid.cost.coffee,price.coffee);assert.equal(wallet(fresh).coffee,before.coffee-price.coffee);
 });
 await t.test('new onboarding and completed status survive reload and are isolated per user',async()=>{
  const freshReload=await req(fresh,'state');const oldReload=await req(legacy,'state');
  assert.equal(freshReload.onboarding.required,true);assert.equal(freshReload.onboarding.freeSkipUsed,true);
  assert.equal(oldReload.onboarding.required,false);
  assert.equal((await req(fresh,'tutorial',{op:'read'})).tutorial.personal,6);
 });
 db.close();
});
