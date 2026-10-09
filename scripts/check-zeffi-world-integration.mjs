// Real SQLite transaction tests for the additive Mir Zeffi D1 server module.
// Run: node --experimental-sqlite scripts/check-zeffi-world-integration.mjs
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { handleZeffiWorldApi } from '../src/zeffi-world-service.js';
import { CATALOG } from '../world/catalog.js';
import { addObject,makeInitialCity,roadStrokePrice,buyParcel,constructionSkipPrice } from '../world/engine.js';

const db=new DatabaseSync(':memory:');
db.exec(`CREATE TABLE admin_profile_state(telegram_id TEXT PRIMARY KEY,wallet INTEGER NOT NULL,treats INTEGER NOT NULL,coffee INTEGER NOT NULL,revision INTEGER NOT NULL,updated_at INTEGER NOT NULL DEFAULT 0,updated_by TEXT NOT NULL DEFAULT '');`);
db.exec(readFileSync(new URL('../migrations/0114_zeffi_world.sql',import.meta.url),'utf8'));
db.prepare('INSERT INTO admin_profile_state(telegram_id,wallet,treats,coffee,revision) VALUES (?,?,?,?,1)').run('123456789',100000,2000,1000);
class Statement{
 constructor(sql,args=[]){this.sql=sql;this.args=args;}
 bind(...args){return new Statement(this.sql,args);}
 first(){return db.prepare(this.sql).get(...this.args)||null;}
 all(){return {results:db.prepare(this.sql).all(...this.args)};}
 run(){const r=db.prepare(this.sql).run(...this.args);return {meta:{changes:Number(r.changes)}};}
}
const driver={
 prepare(sql){return new Statement(sql);},
 async batch(statements){
  db.exec('BEGIN IMMEDIATE');
  try{
   const results=statements.map(stmt=>stmt.run());
   db.exec('COMMIT');return results;
  }catch(e){db.exec('ROLLBACK');throw e;}
 }
};
const env={DB:driver,WORLD_ENABLED:'true',WORLD_TESTER_IDS:'123456789',WORLD_PURCHASES_ENABLED:'true'};
const deps={
 resolvePlayerAuth:async (_request,body)=>{if(body.initData!=='signed-test-player')throw Object.assign(new Error('Telegram required'),{status:401});return {user:{id:123456789},telegramId:'123456789'};},
 ensureAuthoritativeProfileRow:async (_env,id)=>driver.prepare('SELECT * FROM admin_profile_state WHERE telegram_id=?').bind(id).first(),
 requirePlayerOperationAvailable:async()=>true
};
const signed={initData:'signed-test-player'};
const url='https://world.example.invalid/api/world/';
async function request(path,body={},customEnv=env){
 const response=await handleZeffiWorldApi(new Request(url+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...signed,...body})}),customEnv,deps);
 return {status:response.status,...await response.json()};
}
let count=0;
async function check(name,test){await test();console.log('PASS',++count,name);}
const wallet=()=>driver.prepare('SELECT wallet,treats,coffee,revision FROM admin_profile_state WHERE telegram_id=?').bind('123456789').first();
const receiptCount=()=>driver.prepare('SELECT COUNT(*) AS n FROM zeffi_world_operations').first().n;
let state=await request('state');
await check('signed player can create and load city in same DB',()=>{
 assert.equal(state.status,200);assert.equal(state.revision,0);assert.equal(state.city.objects.length,4);
 assert.equal(state.city.wallet.points,100000);
});
await check('unsigned request denied',async()=>{const r=await handleZeffiWorldApi(new Request(url+'state',{method:'POST',body:JSON.stringify({initData:'wrong'})}),env,deps);assert.equal(r.status,401);});
await check('default disabled feature fails closed',async()=>{assert.equal((await request('state',{}, {...env,WORLD_ENABLED:''})).status,403);});
await check('unauthorized tester fails closed',async()=>{assert.equal((await request('state',{}, {...env,WORLD_TESTER_IDS:''})).status,403);});
await check('purchases disabled; no money or city change',async()=>{
 const before=wallet();
 const price=CATALOG['cottage'].price;
 const r=await request('mutate',{requestId:'world-disabled-12345',expectedRevision:0,expectedPrice:price,action:{kind:'place',args:{objectKind:'cottage',x:17,y:18,rotation:0}}},{...env,WORLD_PURCHASES_ENABLED:'false'});
 assert.equal(r.status,403);assert.deepEqual(wallet(),before);assert.equal(receiptCount(),0);
});
const price={...CATALOG['cottage'].price};
const action={kind:'place',args:{objectKind:'cottage',x:17,y:18,rotation:0}};
const opID='world-buy-cottage-123456789';
let first=await request('mutate',{requestId:opID,expectedRevision:0,expectedPrice:price,action});
await check('building purchase updates shared wallet and city',()=>{
 assert.equal(first.status,200,first.error);assert.equal(first.revision,1);
 assert.equal(first.city.objects.length,5);assert.equal(wallet().wallet,100000-price.points);
 assert.equal(wallet().treats,2000-price.treats);assert.equal(receiptCount(),1);
});
await check('retry is idempotent without second charge',async()=>{
 const before=wallet();const r=await request('mutate',{requestId:opID,expectedRevision:0,expectedPrice:price,action});
 assert.equal(r.status,200);assert.equal(r.repeated,true);assert.equal(r.revision,1);
 assert.deepEqual(wallet(),before);assert.equal(receiptCount(),1);
});
await check('stale revision fails without debit',async()=>{
 const before=wallet();const r=await request('mutate',{requestId:'world-new-but-stale-1234',expectedRevision:0,expectedPrice:price,action:{kind:'place',args:{objectKind:'tree',x:18,y:18,rotation:0}}});
 assert.equal(r.status,409);assert.deepEqual(wallet(),before);assert.equal(receiptCount(),1);
});
await check('wrong quoted price fails without debit',async()=>{
 const before=wallet();const r=await request('mutate',{requestId:'world-badquote-123456789',expectedRevision:1,expectedPrice:{points:1,treats:0,coffee:0},action:{kind:'place',args:{objectKind:'tree',x:20,y:20,rotation:0}}});
 assert.equal(r.status,409);assert.equal(r.code,'WORLD_PRICE_CHANGED');assert.deepEqual(wallet(),before);
});
await check('malicious full city snapshot cannot replace server save',async()=>{
 const before=wallet();const r=await request('mutate',{requestId:'world-overwrite-123456789',expectedRevision:1,expectedPrice:{points:0,treats:0,coffee:0},action:{kind:'overwrite',args:{wallet:{points:999999}}}});
 assert.equal(r.status,400);assert.deepEqual(wallet(),before);
});
await check('move/store are valid zero-cost commands',async()=>{
 const before=wallet();
 const uid=first.city.objects.at(-1).uid;
 const r=await request('mutate',{requestId:'world-store-house-123456789',expectedRevision:1,expectedPrice:{points:0,treats:0,coffee:0},action:{kind:'store',args:{uid}}});
 assert.equal(r.status,200,r.error);assert.equal(r.revision,2);assert.deepEqual(wallet(),before);
 assert.equal(r.city.objects.at(-1).stored,true);
});
await check('road purchase paid only for new cells',async()=>{
 const previous=await request('state');
 const positions=[{x:16,y:13},{x:17,y:13}];
 const quoted=roadStrokePrice(previous.city,positions);
 const before=wallet();
 const r=await request('mutate',{requestId:'world-road-buy-123456789',expectedRevision:previous.revision,expectedPrice:quoted,action:{kind:'road',args:{positions}}});
 assert.equal(r.status,200,r.error);assert.equal(r.cost.points,quoted.points);assert.equal(wallet().wallet,before.wallet-quoted.points);
});
await check('parcel price comes from authoritative number of previous purchases',async()=>{
 const prev=await request('state');const cx=6,cy=2;
 const newCity=buyParcel(prev.city,cx,cy);const expectedPrice={points:prev.city.wallet.points-newCity.wallet.points,treats:prev.city.wallet.treats-newCity.wallet.treats,coffee:0};
 const r=await request('mutate',{requestId:'world-land-buy-123456789',expectedRevision:prev.revision,expectedPrice,action:{kind:'parcel',args:{cx,cy}}});
 assert.equal(r.status,200,r.error);assert.equal(r.city.parcels.length,1);
});
await check('CAS conflicts roll back CITY update when wallet updated concurrently',async()=>{
 const prev=await request('state');const before=wallet();
 const road=[{x:18,y:13}];const quoted=roadStrokePrice(prev.city,road);
 const conflictingDriver={...driver,batch:async statements=>{db.prepare("UPDATE admin_profile_state SET revision=revision+1 WHERE telegram_id='123456789'").run();return driver.batch(statements);}};
 const response=await request('mutate',{requestId:'world-profile-race-123456789',expectedRevision:prev.revision,expectedPrice:quoted,action:{kind:'road',args:{positions:road}}},{...env,DB:conflictingDriver});
 assert.equal(response.status,409);assert.equal(receiptCount(),4);
 const latest=await request('state');assert.equal(latest.revision,prev.revision);assert.deepEqual(latest.city.roads,prev.city.roads);
 assert.equal(wallet().wallet,before.wallet);
});
await check('building acceleration charges only shared coffee once',async()=>{
 const prev=await request('state');
 const kind='cottage';const args={objectKind:kind,x:18,y:18,rotation:0};
 const price={...CATALOG[kind].price};
 const build=await request('mutate',{requestId:'world-accelerate-house-build-1234',expectedRevision:prev.revision,expectedPrice:price,action:{kind:'place',args}});
 assert.equal(build.status,200,build.error);
 const uid=build.city.objects.at(-1).uid;
 const quote=constructionSkipPrice(build.city.objects.at(-1));
 assert.equal(quote.coffee,70);
 const before=wallet();
 const payload={requestId:'world-accelerate-house-skip-1234',expectedRevision:build.revision,expectedPrice:{points:0,treats:0,coffee:quote.coffee},action:{kind:'skip',args:{uid}}};
 const skip=await request('mutate',payload);
 assert.equal(skip.status,200,skip.error);assert.equal(wallet().coffee,before.coffee-70);
 assert.equal(skip.city.objects.at(-1).buildReadyAt,0);
 const receipt=await request('mutate',payload);
 assert.equal(receipt.status,200);assert.equal(receipt.repeated,true);assert.equal(wallet().coffee,before.coffee-70);
});
await check('park acceleration starts at 50 coffee in the same profile',async()=>{
 const prev=await request('state');
 const park={objectKind:'garden',x:17,y:3,rotation:0};
 const price={...CATALOG.garden.price};
 const build=await request('mutate',{requestId:'world-accelerate-garden-build-12',expectedRevision:prev.revision,expectedPrice:price,action:{kind:'place',args:park}});
 assert.equal(build.status,200,build.error);
 const uid=build.city.objects.at(-1).uid;
 const quote=constructionSkipPrice(build.city.objects.at(-1));
 assert.equal(quote.coffee,50);
 const before=wallet();
 const skip=await request('mutate',{requestId:'world-accelerate-garden-skip-123',expectedRevision:build.revision,expectedPrice:{points:0,treats:0,coffee:50},action:{kind:'skip',args:{uid}}});
 assert.equal(skip.status,200,skip.error);assert.equal(wallet().coffee,before.coffee-50);
});
await check('insufficient shared wallet never records purchase',async()=>{
 const prev=await request('state');
 const original=wallet();
 db.prepare('UPDATE admin_profile_state SET wallet=0,revision=revision+1 WHERE telegram_id=?').run('123456789');
 const before=wallet();const receiptBefore=receiptCount();
 const result=await request('mutate',{requestId:'world-insufficient-123456789',expectedRevision:prev.revision,expectedPrice:{...CATALOG.tree.price},action:{kind:'place',args:{objectKind:'tree',x:20,y:22,rotation:0}}});
 assert.equal(result.status,409);assert.equal(result.code,'INSUFFICIENT_BALANCE');
 assert.equal(receiptCount(),receiptBefore);assert.deepEqual(wallet(),before);
 db.prepare('UPDATE admin_profile_state SET wallet=?,revision=revision+1 WHERE telegram_id=?').run(original.wallet,'123456789');
});
console.log(`WORLD D1 checks: ${count} passed`);
