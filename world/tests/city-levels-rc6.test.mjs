import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CATALOG,CATALOG_ITEMS,SHOP_UNLOCK_LEVELS} from '../catalog.js';
import {RU} from '../ru.js';
import {
 CITY_LEVELS,makeInitialCity,cloneCity,cityStats,addObject,checkPlacement,
 storeObject,restoreObject,moveObject,sanitizeCity,claimCityLevelReward,reconcileCityProgress,BuildError,keyOf,
 isObjectConnected,connectedRoads
} from '../engine.js';
import {nextCityGoal} from '../city-goal.js';
const NOW=1_800_000_000_000;
const money=['points','coffee','treats'];
const failed=(fn,code)=>assert.throws(fn,e=>e instanceof BuildError&&e.code===code);

test('RC6 keeps the exact original levels 1..5 and adds monotonic, reachable levels 6..10',()=>{
 assert.equal(CITY_LEVELS.length,10);
 assert.deepEqual(CITY_LEVELS.map(x=>x.level),[1,2,3,4,5,6,7,8,9,10]);
 assert.deepEqual(CITY_LEVELS.map(x=>[x.residents,x.comfort,x.parks,x.shops]),[
  [0,0,0,0],[4,30,1,0],[8,60,1,1],[15,120,2,1],[25,220,2,2],
  [32,270,3,2],[40,330,3,3],[50,400,4,3],[60,480,4,4],[70,560,5,4]
 ]);
 assert.deepEqual(CITY_LEVELS.slice(0,5).map(x=>x.reward?.points||0),[0,500,1000,2000,4000]);
 for(let n=1;n<=10;n++){
  assert.equal(typeof RU[`cityLevel${n}`],'string');
  assert.ok(RU[`cityLevel${n}`].trim().length>2);
  if(n>1){
   const now=CITY_LEVELS[n-1],before=CITY_LEVELS[n-2];
   assert.ok(now.residents>before.residents);
   assert.ok(now.comfort>before.comfort);
   assert.ok(now.parks>=before.parks);
   assert.ok(now.shops>=before.shops);
   for(const k of money)assert.ok(Number.isSafeInteger(now.reward[k])&&now.reward[k]>=0);
  }
 }
});

test('RC6 reuses all 50 existing paid objects and spreads real unlocks over each level 1..10',()=>{
 assert.equal(CATALOG_ITEMS.length,50);
 assert.equal(Object.keys(SHOP_UNLOCK_LEVELS).length,CATALOG_ITEMS.length);
 assert.deepEqual(Object.keys(SHOP_UNLOCK_LEVELS).sort(),CATALOG_ITEMS.map(x=>x.id).sort());
 for(const def of CATALOG_ITEMS){
  assert.equal(def.minCityLevel,SHOP_UNLOCK_LEVELS[def.id]);
  assert.ok(Number.isInteger(def.minCityLevel)&&def.minCityLevel>=1&&def.minCityLevel<=10);
  assert.ok(def.price.points>0);
 }
 for(let level=1;level<=10;level++){
  assert.ok(CATALOG_ITEMS.some(def=>def.minCityLevel===level),`No actual reward/unlock for level ${level}`);
 }
 assert.equal(CATALOG['cottage'].minCityLevel,1);
 assert.equal(CATALOG['playground'].minCityLevel,1);
 assert.equal(CATALOG['bus-terminal'].minCityLevel,7);
 assert.equal(CATALOG['botanical-garden'].minCityLevel,8);
 assert.equal(CATALOG['monument'].minCityLevel,9);
 assert.equal(CATALOG['white-rabbit-zephirok'].minCityLevel,10);
 assert.equal(CATALOG['plaza-prestige-podium'].minCityLevel,10);
});

test('RC6 purchase authority stops early prestige buys and keeps old owned buildings movable',()=>{
 const legacy=makeInitialCity(); legacy.wallet={points:1_000_000,treats:1_000_000,coffee:1000};
 for(const [kind,min] of [['city-square',6],['bus-terminal',7],['botanical-garden',8],['monument',9],['white-rabbit-zephirok',10]]){
  const city=cloneCity(legacy);city.progress.bestLevel=min-1;
  const before=JSON.stringify(city);
  failed(()=>addObject(city,CATALOG,kind,17,17,0,NOW),'BUILDING_LEVEL_LOCKED');
  assert.equal(JSON.stringify(city),before);
 }
 let city=cloneCity(legacy);city.progress.bestLevel=10;
 city=addObject(city,CATALOG,'white-rabbit-zephirok',17,17,0,NOW);
 const uid=city.objects.at(-1).uid,afterDebit={...city.wallet};
 // Simulate pre-RC6 ownership / a legacy save: never lock *existing* property.
 city.progress.bestLevel=1;
 city=moveObject(city,CATALOG,uid,18,18,0);
 city=storeObject(city,uid);
 city=restoreObject(city,CATALOG,uid,17,17,0);
 assert.deepEqual(city.wallet,afterDebit);
 assert.deepEqual(sanitizeCity(JSON.parse(JSON.stringify(city)),CATALOG),city);
});

test('RC6 accepts 9 claimed levels but rejects forged/doubled grants',()=>{
 const seed=makeInitialCity();seed.wallet={points:100000,treats:10000,coffee:1000};
 seed.progress.bestLevel=10;
 seed.progress.claimedLevels=[2,3,4,5,6,7,8,9];
 const original=JSON.stringify(seed);
 const ten=claimCityLevelReward(seed,CATALOG,10,NOW);
 assert.equal(JSON.stringify(seed),original);
 assert.deepEqual(ten.progress.claimedLevels,[2,3,4,5,6,7,8,9,10]);
 for(const k of money)assert.equal(ten.wallet[k],seed.wallet[k]+CITY_LEVELS[9].reward[k]);
 assert.deepEqual(sanitizeCity(JSON.parse(JSON.stringify(ten)),CATALOG),ten);
 failed(()=>claimCityLevelReward(ten,CATALOG,10,NOW),'CITY_LEVEL_CLAIMED');
 const bad=cloneCity(ten);bad.progress.claimedLevels.push(10);
 failed(()=>sanitizeCity(bad,CATALOG),'INVALID_SAVE');
 const impossible=cloneCity(seed);impossible.progress.bestLevel=11;
 failed(()=>sanitizeCity(impossible,CATALOG),'INVALID_SAVE');
 const locked=cloneCity(seed);locked.progress.bestLevel=5;
 failed(()=>claimCityLevelReward(locked,CATALOG,10,NOW),'CITY_LEVEL_LOCKED');
});

test('RC6 server uses the same 10-level bound; currency rewards remain Worker-selected and atomic',()=>{
 const server=readFileSync(new URL('../../src/zeffi-world-service.js',import.meta.url),'utf8');
 assert.match(server,/args\.level>CITY_LEVELS\.length/);
 assert.doesNotMatch(server,/args\.level>5/);
 assert.match(server,/const reward=granting\?\(catalog\.__cityLevels\|\|CITY_LEVELS\)\[action\.level-1\]\.reward:ZERO/);
 assert.match(server,/await db\.batch\(statements\)/);
 assert.match(server,/const credit=granting/);
});

test('RC6 existing guide points to levels 6..10 and correctly stops only after level 10',()=>{
 const city=makeInitialCity();city.wallet.points=1_000_000;city.wallet.treats=1_000_000;
 const state={cityLevel:5,claimableLevel:null,nextCityLevel:CITY_LEVELS[5],parks:2,shops:2,population:25,comfort:220};
 const next=nextCityGoal({city,stats:state,catalog:CATALOG,catalogItems:CATALOG_ITEMS,purchasesEnabled:true});
 assert.notEqual(next.type,'done');
 const last=nextCityGoal({city,stats:{...state,cityLevel:10,claimableLevel:null,nextCityLevel:null},catalog:CATALOG,catalogItems:CATALOG_ITEMS});
 assert.equal(last.type,'done');
});

// An end-to-end local world growth scenario. Every structure is actually
// purchased through addObject, needs-road structures have connected roads,
// construction is complete, the resulting save remains valid.
let buildNow=NOW;
function buildableCity(){
 let city=makeInitialCity();city.wallet={points:200_000_000,treats:3_000_000,coffee:500_000};
 const roads=new Set(city.roads);
 for(let x=0;x<24;x++)for(const y of [1,6,13,20])roads.add(keyOf(x,y));
 for(let y=0;y<24;y++)roads.add(keyOf(2,y));
 city.roads=[...roads];
 return city;
}
function nextPlot(city,kind){
 const def=CATALOG[kind], roads=new Set(city.roads);
 const choices=[];
 for(let y=0;y<=24-def.h;y++)for(let x=0;x<=24-def.w;x++){
  if(!checkPlacement(city,CATALOG,kind,x,y).ok)continue;
  let touching=false;
  for(let xx=x;xx<x+def.w;xx++)if(roads.has(keyOf(xx,y-1))||roads.has(keyOf(xx,y+def.h)))touching=true;
  for(let yy=y;yy<y+def.h;yy++)if(roads.has(keyOf(x-1,yy))||roads.has(keyOf(x+def.w,yy)))touching=true;
  if(def.needsRoad&&!touching)continue;
  // Parks should leave the best roadside plots for connected residences.
  choices.push({x,y,weight:((!def.needsRoad&&touching)?100:0)+(y<7?12:0)+x*.01+y*.001});
 }
 choices.sort((a,b)=>a.weight-b.weight);
 return choices[0]||null;
}
function place(city,kind){
 const where=nextPlot(city,kind);
 assert.ok(where,`24x24 planner could not place ${kind} at city level ${cityStats(city,CATALOG,buildNow).cityLevel}`);
 const ms=Number(CATALOG[kind].buildMs||0);
 let next;try{next=addObject(city,CATALOG,kind,where.x,where.y,0,buildNow);}catch(e){throw new Error(`placement ${kind} requires ${CATALOG[kind].minCityLevel} while city ${cityStats(city,CATALOG,buildNow).cityLevel}, x=${where.x} y=${where.y}: ${e.message}`)}
 buildNow+=1_000_000;
 const placed=next.objects.at(-1);
 if(CATALOG[kind].needsRoad)assert.ok(isObjectConnected(placed,next,CATALOG,connectedRoads(next),buildNow),`${kind} lacks road`);
 assert.equal(cityStats(next,CATALOG,buildNow).constructing,0);
 return next;
}

test('RC6: an authentic 24x24 personal city can grow from level 1 to level 10 without level-lock deadlocks',()=>{
 let city=buildableCity();
 for(let targetLevel=2;targetLevel<=10;targetLevel++){
  const target=CITY_LEVELS[targetLevel-1];
  let iter=0;
  while(cityStats(city,CATALOG,buildNow).cityLevel<targetLevel){
   assert.ok(++iter<100,`progress stalled before level ${targetLevel}`);
   const s=cityStats(city,CATALOG,buildNow);
   const level=s.cityLevel;
   let kind;
   if(s.parks<target.parks)kind=(level>=3?'pond-park':'playground');
   else if(s.shops<target.shops)kind='coffee-kiosk';
   else if(s.population<target.residents)kind=level>=3?'villa':level>=2?'family-home':'cottage';
   else if(s.comfort<target.comfort)kind=level>=5?'garden':level>=3?'pond-park':'playground';
   else throw new Error(`Stats are complete but level did not advance: ${JSON.stringify(s)}`);
   city=place(city,kind);
  }
  assert.ok(cityStats(city,CATALOG,buildNow).cityLevel>=targetLevel,`failed to achieve tier ${targetLevel}`);
 }
 const stats=cityStats(city,CATALOG,buildNow);
 assert.equal(stats.cityLevel,10);
 assert.ok(stats.population>=70);
 assert.ok(stats.comfort>=560);
 assert.ok(stats.parks>=5&&stats.shops>=4);
 assert.deepEqual(sanitizeCity(JSON.parse(JSON.stringify(city)),CATALOG),city);
 // An existing lvl 5 player's saved rewards survive. Progress to lvl 10
 // is reconciled from real completed objects; new grants remain one-time.
 let progressed=reconcileCityProgress(city,CATALOG,buildNow);
 assert.equal(progressed.progress.bestLevel,10);
 progressed.progress.claimedLevels=[2,3,4,5];
 for(let level=6;level<=10;level++){
  assert.equal(cityStats(progressed,CATALOG,buildNow).claimableLevel,level);
  const old={...progressed.wallet};
  progressed=claimCityLevelReward(progressed,CATALOG,level,buildNow);
  for(const k of money)assert.equal(progressed.wallet[k],old[k]+CITY_LEVELS[level-1].reward[k]);
  failed(()=>claimCityLevelReward(progressed,CATALOG,level,buildNow),'CITY_LEVEL_CLAIMED');
 }
 assert.equal(cityStats(progressed,CATALOG,buildNow).claimableLevel,null);
 assert.deepEqual(sanitizeCity(JSON.parse(JSON.stringify(progressed)),CATALOG),progressed);
});

// Exercise the real signed World mutation handler against SQLite, with the
// same guarded D1 batch contract as production; no mock wallet credits.
test('RC6 Worker/D1: level-10 gift credits all currencies atomically and request replay never double-credits',async()=>{
 const {DatabaseSync}=await import('node:sqlite');
 const {handleZeffiWorldApi}=await import('../../src/zeffi-world-service.js');
 const db=new DatabaseSync(':memory:');
 db.exec(`CREATE TABLE admin_profile_state (
  telegram_id TEXT PRIMARY KEY,wallet INTEGER NOT NULL,coffee INTEGER NOT NULL,treats INTEGER NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,updated_at INTEGER,updated_by TEXT DEFAULT '');`);
 db.exec("INSERT INTO admin_profile_state VALUES ('12345',200000,500,1000,0,0,'')");
 db.exec(readFileSync(new URL('../../migrations/0114_zeffi_world.sql',import.meta.url),'utf8'));
 const stored=makeInitialCity();stored.progress.bestLevel=10;stored.progress.claimedLevels=[2,3,4,5,6,7,8,9];
 stored.wallet={points:0,treats:0,coffee:0};
 db.prepare('INSERT INTO zeffi_world_cities(telegram_id,revision,state_json,last_request_id,created_at,updated_at) VALUES (?,?,?,?,?,?)')
  .run('12345',0,JSON.stringify(stored),'',1,1);
 const prepared=sql=>({
  all:async()=>({results:db.prepare(sql).all()}),
  first:async()=>db.prepare(sql).get()??null,
  run:async()=>{const r=db.prepare(sql).run();return {meta:{changes:Number(r.changes)}};},
  bind(...args){const stmt=db.prepare(sql);return{
   all:async()=>({results:stmt.all(...args)}),
   first:async()=>stmt.get(...args)??null,
   run:async()=>{const r=stmt.run(...args);return {meta:{changes:Number(r.changes)}};}
  };}
 });
 const adapter={prepare:prepared,async batch(stmts){
  db.exec('BEGIN TRANSACTION');
  try{const rows=[];for(const statement of stmts)rows.push(await statement.run());db.exec('COMMIT');return rows;}
  catch(error){db.exec('ROLLBACK');throw error;}
 }};
 const env={DB:adapter,WORLD_ENABLED:'true',WORLD_TESTER_IDS:'12345',WORLD_PURCHASES_ENABLED:'true',WORLD_RESIDENT_REQUESTS_ENABLED:'false'};
 const deps={resolvePlayerAuth:async(_request,body)=>body?.initData==='signed'?{telegramId:'12345'}:null,
  ensureAuthoritativeProfileRow:async()=>db.prepare("SELECT * FROM admin_profile_state WHERE telegram_id='12345'").get(),
  requirePlayerOperationAvailable:async()=>true};
 const call=async(action,requestId,expectedRevision=0)=>{
  const request=new Request('https://zeffi.test/api/world/mutate',{
   method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
    initData:'signed',requestId,expectedRevision,expectedPrice:{points:0,treats:0,coffee:0},action
   })
  });
  const response=await handleZeffiWorldApi(request,env,deps);
  return {status:response.status,body:await response.json()};
 };
 const a=await call({kind:'claim-level',args:{level:10}},'rc6-claim-level10-00001');
 assert.equal(a.status,200,JSON.stringify(a.body));
 assert.deepEqual(a.body.reward,CITY_LEVELS[9].reward);
 assert.deepEqual(a.body.operation,{id:'rc6-claim-level10-00001',kind:'claim-level',state:'completed',repeated:false});
 const profile=()=>db.prepare("SELECT wallet,treats,coffee,revision FROM admin_profile_state WHERE telegram_id='12345'").get();
 const afterFirst=profile();
 for(const [field,initial] of [['wallet',200000],['treats',1000],['coffee',500]]){
  const key=field==='wallet'?'points':field;
  assert.equal(afterFirst[field],initial+CITY_LEVELS[9].reward[key]);
 }
 const same=await call({kind:'claim-level',args:{level:10}},'rc6-claim-level10-00001');
 assert.equal(same.status,200);assert.equal(same.body.repeated,true);
 assert.deepEqual(profile(),afterFirst);
 const second=await call({kind:'claim-level',args:{level:10}},'rc6-claim-level10-00002',1);
 assert.equal(second.status,400);assert.equal(second.body.code,'CITY_LEVEL_CLAIMED');
 assert.deepEqual(profile(),afterFirst);
 const over=await call({kind:'claim-level',args:{level:11}},'rc6-claim-level11-00003',1);
 assert.equal(over.status,400);assert.equal(over.body.code,'BAD_ACTION');
 assert.deepEqual(profile(),afterFirst);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM zeffi_world_operations').get().n,1);
 const city=JSON.parse(db.prepare("SELECT state_json FROM zeffi_world_cities WHERE telegram_id='12345'").get().state_json);
 assert.deepEqual(city.progress.claimedLevels,[2,3,4,5,6,7,8,9,10]);
});
