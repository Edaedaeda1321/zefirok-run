import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {CATALOG} from '../catalog.js';
import {WORLD_REWARD_DECORS} from '../decor-rewards.js';
import {SPRITE_MANIFEST} from '../sprite-manifest.js';
import {buildingAssetId,spriteMetadata,catalogSpriteId} from '../sprite-assets.js';
import {buildStoryMap,validateStoryMap} from '../story/map.js';
import {createDemoState} from '../story/model.js';
import {makeInitialCity,addObject,storeObject,restoreObject,skipConstruction,checkPlacement,sanitizeCity,isConstructing} from '../engine.js';
import {defaultWorldBalance,validateWorldBalance} from '../world-balance.js';
import {handleOwnerPalace} from '../../src/zeffi-world-palace-admin.js';
const root=dirname(fileURLToPath(new URL('../index.html',import.meta.url)));
const PALACE='palace-of-memories';
const NOW=1_800_000_000_000;
function fixture(){
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE admin_profile_state(telegram_id TEXT PRIMARY KEY,wallet INTEGER,coffee INTEGER,treats INTEGER);INSERT INTO admin_profile_state VALUES (\'12345\',1000000,500,1000);');
 db.exec(readFileSync(new URL('../../migrations/0124_zeffi_palace_memories.sql',import.meta.url),'utf8'));
 const adapter={prepare(sql){const stmt=db.prepare(sql);return {
  first:async()=>stmt.get()??null,all:async()=>({results:stmt.all()}),
  bind(...args){return{first:async()=>stmt.get(...args)??null,all:async()=>({results:stmt.all(...args)}),run:async()=>({meta:{changes:Number(stmt.run(...args).changes)}})};}
 };},async batch(statements){db.exec('BEGIN IMMEDIATE');try{const results=[];for(const s of statements)results.push(await s.run());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}};
 return {db,env:{DB:adapter},owner:{access:{owner:true},user:{id:12345}},profile:()=>db.prepare('SELECT * FROM admin_profile_state').get()};
}

test('all 16 CC decor thumbnails are real existing WebP; gift fallback is not used',()=>{
 assert.equal(WORLD_REWARD_DECORS.length,16);
 for(const item of WORLD_REWARD_DECORS){assert.equal(CATALOG[item.id].category,'decor');assert.notEqual(item.imageUrl,'/assets/ui/icon_prize.webp');const path=join(root,'..',item.imageUrl);assert.ok(existsSync(path),`${item.id}: ${path}`);const bytes=readFileSync(path);assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');}
});
test('Palace has exactly 10 supplied, separately addressable unrotated stages',()=>{
 const assets=SPRITE_MANIFEST.assets.filter(a=>a.packId==='palace-memories-review-v1');assert.equal(assets.length,10);
 for(let stage=1;stage<=10;stage++){
  const sprite=buildingAssetId(`story-palace-memories-${String(stage).padStart(2,'0')}`);
  const meta=spriteMetadata(sprite);assert.equal(sprite,`palace_memories_${String(stage).padStart(2,'0')}`);
  assert.equal(meta.directionVerified,false);assert.deepEqual(meta.footprint,[6,6]);assert.equal(meta.facing,'n');
  const path=join(root,meta.fileWebp);assert.ok(existsSync(path),path);const data=readFileSync(path);assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WEBP');
 }
 assert.equal(buildingAssetId(PALACE,0,'complete'),'palace_memories_10');
 for(const progress of [0,.15,.51,.99])assert.ok(/^palace_memories_0[1-9]$/.test(buildingAssetId(PALACE,0,'build_01',progress)));
});
test('Palace occupies a legal non-overlapping 6x6 shared plot in each chapter and each state',()=>{
 for(const chapter of [0,1,2])for(const palaceStage of [1,5,10]){
  const map=buildStoryMap({...createDemoState(),chapter,palaceStage});assert.deepEqual(validateStoryMap(map),[]);
  const palace=map.objects.filter(x=>x.uid==='story-palace-memories');assert.equal(palace.length,1);
  assert.equal(palace[0].kind,`story-palace-memories-${String(palaceStage).padStart(2,'0')}`);
  assert.deepEqual([palace[0].x,palace[0].y,palace[0].rotation],[22,5,0]);
  assert.equal(catalogSpriteId(palace[0].kind),'palace_memories_'+String(palaceStage).padStart(2,'0'));
 }
});
test('Personal Palace is one 24-hour construction, unlocked strictly at city level 10 and paid once',()=>{
 let city=makeInitialCity();city.wallet={points:600000,coffee:500,treats:1500};city.progress.bestLevel=9;
 assert.equal(CATALOG[PALACE].minCityLevel,10);
 assert.deepEqual(CATALOG[PALACE].price,{points:280000,coffee:0,treats:500});
 assert.deepEqual([CATALOG[PALACE].w,CATALOG[PALACE].h],[6,6]);
 assert.equal(checkPlacement(city,CATALOG,PALACE,16,16,1).code,'INVALID_POSITION');
 assert.throws(()=>addObject(city,CATALOG,PALACE,16,16,0,NOW),e=>e.code==='BUILDING_LEVEL_LOCKED');
 city.progress.bestLevel=10;
 const oldWallet={...city.wallet};city=addObject(city,CATALOG,PALACE,16,16,0,NOW);
 assert.deepEqual(city.wallet,{points:oldWallet.points-280000,coffee:oldWallet.coffee,treats:oldWallet.treats-500});
 const item=city.objects.at(-1);assert.equal(item.buildReadyAt-item.buildStartedAt,86400000);
 assert.equal(isConstructing(item,NOW+1000),true);
 const after=JSON.stringify(city);assert.throws(()=>skipConstruction(city,item.uid,NOW+120000),e=>e.code==='SKIP_UNAVAILABLE');assert.equal(JSON.stringify(city),after);
 assert.throws(()=>addObject(city,CATALOG,PALACE,1,17,0,NOW),e=>e.code==='ALREADY_OWNED');
 city=storeObject(city,item.uid);city=restoreObject(city,CATALOG,item.uid,16,16,0);
 assert.equal(city.wallet.points,oldWallet.points-280000);
 assert.deepEqual(sanitizeCity(JSON.parse(JSON.stringify(city)),CATALOG),city);
});
test('old P1 persisted balance config is accepted, Palace cannot be unlocked below level 10',()=>{
 const spec=defaultWorldBalance();delete spec.items[PALACE];
 const valid=validateWorldBalance(spec,{reachability:false});assert.equal(valid.items[PALACE].minCityLevel,10);
 spec.items[PALACE]={...valid.items[PALACE],minCityLevel:2};
 assert.throws(()=>validateWorldBalance(spec,{reachability:false}),/уровня|уровень/i);
});
test('Palace funding is server-disabled, stage change is authenticated, idempotent and atomic',async()=>{
 const f=fixture(),walletBefore=f.profile();
 const read=async(ctx=f.owner)=>handleOwnerPalace({env:f.env,ctx:{...ctx,body:{}},path:'/api/owner/world/palace'});
 const initial=await read();assert.equal(initial.palace.stage,1);assert.equal(initial.palace.contributionsEnabled,false);
 assert.equal(initial.history.length,0);
 // Existing real-money contribution API has an immutable two-project allowlist, no Palace row.
 const {COMMUNITY_PROJECTS}=await import('../../src/zeffi-community-fund.js');
 assert.deepEqual(Object.keys(COMMUNITY_PROJECTS).sort(),['festival','garden']);
 await assert.rejects(()=>read({access:{owner:false}}),e=>e.status===403);
 assert.throws(()=>f.db.prepare('UPDATE zeffi_world_palace_state SET contributions_enabled=1 WHERE id=1').run(),/CHECK constraint failed/);
 const command={stage:2,expectedRevision:0,reason:'Начали закладывать фундамент',requestId:'palace-stage-02-0001'};
 const save=async(payload=command,ctx=f.owner)=>handleOwnerPalace({env:f.env,ctx:{...ctx,body:payload},path:'/api/owner/world/palace/stage/save'});
 const saved=await save();assert.equal(saved.palace.stage,2);assert.equal(saved.palace.revision,1);
 assert.equal((await save()).repeated,true);
 await assert.rejects(()=>save({...command,requestId:'palace-stale-new-001'}),e=>e.status===409);
 await assert.rejects(()=>save({...command,stage:1,requestId:'palace-backwards-01'}),e=>e.status===409);
 await assert.rejects(()=>save({...command,stage:10,expectedRevision:1,requestId:'palace-skip-to10-001'}),e=>e.status===409);
 await assert.rejects(()=>save({...command,stage:3,requestId:'palace-unauth-001'},{access:{owner:false}}),e=>e.status===403);
 assert.equal((await read()).history.length,1);
 assert.deepEqual(f.profile(),walletBefore);
 assert.equal(f.db.prepare('SELECT contributions_enabled FROM zeffi_world_palace_state WHERE id=1').get().contributions_enabled,0);
 assert.equal(f.db.prepare('SELECT COUNT(*) AS n FROM zeffi_world_palace_audit').get().n,1);
 f.db.close();
});
