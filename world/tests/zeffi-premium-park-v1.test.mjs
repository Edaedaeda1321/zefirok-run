import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CATALOG,CATALOG_ITEMS,SHOP_UNLOCK_LEVELS} from '../catalog.js';
import {OBJECT_PRICES} from '../economy.js';
import {makeInitialCity,addObject,checkPlacement,cityStats,isConstructing,constructionSkipPrice,connectedRoads} from '../engine.js';
import {SPRITE_MANIFEST} from '../sprite-manifest.js';
import {spriteMetadata,catalogSpriteId,buildingAssetId,preloadBuildFrames} from '../sprite-assets.js';
import {STORY_CATALOG,STORY_GLOBAL_PARK_KIND,buildStoryMap,validateStoryMap,placeById} from '../story/map.js';
import {createDemoState,setDemoChapter} from '../story/model.js';
import {defaultWorldBalance,validateWorldBalance,createWorldBalanceRuntime} from '../world-balance.js';

const PARK='central-park-zeffi';
const GLOBAL='story-global-park-zeffi';
const NOW=1_800_000_000_000;

test('new park is a separate level-8 6x6 player purchase; 7x7 square retains its existing price and ID',()=>{
 assert.equal(CATALOG_ITEMS.length,52);
 assert.deepEqual([CATALOG[PARK].w,CATALOG[PARK].h],[6,6]);
 assert.equal(SHOP_UNLOCK_LEVELS[PARK],8);
 assert.deepEqual(OBJECT_PRICES[PARK],{points:65000,coffee:0,treats:150});
 assert.deepEqual([CATALOG['zeffi-central-square'].w,CATALOG['zeffi-central-square'].h],[7,7]);
 assert.deepEqual(OBJECT_PRICES['zeffi-central-square'],{points:42000,coffee:0,treats:90});
 assert.equal(Object.hasOwn(CATALOG,GLOBAL),false,'world-only park must NOT enter the shop');
 assert.equal(Object.hasOwn(OBJECT_PRICES,GLOBAL),false,'world-only park must have NO purchasable price');
 assert.deepEqual([STORY_CATALOG[GLOBAL].w,STORY_CATALOG[GLOBAL].h],[6,6]);
});

test('purchase obeys the level, server quote, construction and one-time cost',()=>{
 const city=makeInitialCity();city.wallet={points:200000,treats:500,coffee:100};city.progress.bestLevel=7;
 assert.equal(checkPlacement(city,CATALOG,PARK,16,16).ok,true);
 assert.throws(()=>addObject(city,CATALOG,PARK,16,16,0,NOW),e=>e.code==='BUILDING_LEVEL_LOCKED');
 city.progress.bestLevel=8;
 const built=addObject(city,CATALOG,PARK,16,16,0,NOW);
 assert.equal(built.wallet.points,135000);
 assert.equal(built.wallet.treats,350);
 assert.equal(built.wallet.coffee,100);
 const item=built.objects.find(o=>o.kind===PARK);
 assert.ok(item);
 assert.equal(item.buildReadyAt-NOW,360000);
 assert.equal(constructionSkipPrice(item,NOW).coffee,50);
 assert.equal(isConstructing(item,NOW+500),true);
 assert.equal(isConstructing(item,NOW+360000),false);
 assert.equal(cityStats(built,CATALOG,NOW+360001).comfort>=42,true);
});

test('all six building phases have independent WebP IDs with deterministic progress mapping',()=>{
 const seen=new Set();
 for(let i=1;i<=6;i++){
  const id=`zeffi_park_build_0${i}`;
  assert.equal(buildingAssetId(PARK,0,`build_0${i}`),id);
  assert.equal(buildingAssetId(PARK,0,'build_01',(i-1)/6),id);
  assert.equal(spriteMetadata(id).state,`build_0${i}`);
  seen.add(id);
 }
 assert.equal(seen.size,6);
 for(let i=0;i<4;i++)assert.equal(catalogSpriteId(PARK,i),`zeffi_park_complete_${'nesw'[i]}`);
 assert.equal(catalogSpriteId(GLOBAL),'zeffi_global_park_n');
 assert.equal(spriteMetadata('zeffi_global_park_n').buildingId,'global_mir_park_zeffi_mir');
});

test('all eleven runtime sprites are separate WebP files with transparent alpha and stable ground spans',()=>{
 const assets=SPRITE_MANIFEST.assets.filter(a=>['zeffi-premium-park-v1','zeffi-global-world-park-v1'].includes(a.packId));
 assert.equal(assets.length,11);
 assert.equal(new Set(assets.map(a=>a.id)).size,11);
 const digests=new Map();
 for(const meta of assets){
  assert.deepEqual(meta.footprint,[6,6]);
  const imgPath=new URL('../'+meta.fileWebp,import.meta.url);
  const file=readFileSync(imgPath);
  assert.equal(file.toString('ascii',0,4),'RIFF');
  assert.equal(file.toString('ascii',8,12),'WEBP');
  assert.ok(file.length>50000 && file.length<600000,`mobile-friendly ${meta.id}: ${file.length}`);
  assert.equal(meta.width,960);assert.equal(meta.height,960);
  assert.ok((meta.groundAlphaBounds[2]-meta.groundAlphaBounds[0])/meta.assetScale<=432+5);
  const digest=createHash('sha256').update(file).digest('hex');
  if(meta.id.startsWith('zeffi_park_build_'))assert.equal(digests.has(digest),false,'two construction frames identical');
  digests.set(digest,meta.id);
 }
 assert.ok(statSync(new URL('../assets/zeffi-central-park-v1/webp_states/central_park_zeffi_complete.webp',import.meta.url)).size>100000);
});

test('every chapter: new centre and separate shared-only park are disjoint from roads and other objects',()=>{
 for(const chapter of [0,1,2]){
  const city=buildStoryMap(setDemoChapter(createDemoState(),chapter));
  assert.deepEqual(validateStoryMap(city),[]);
  const main=city.objects.filter(o=>o.uid==='story-central-square');
  const extra=city.objects.filter(o=>o.uid==='story-global-park-zeffi');
  assert.equal(main.length,1);assert.equal(extra.length,1);
  assert.deepEqual([main[0].kind,main[0].x,main[0].y],[PARK,20,20]);
  assert.deepEqual([extra[0].kind,extra[0].x,extra[0].y],[GLOBAL,34,22]);
  assert.equal(city.objects.some(o=>o.kind==='zeffi-central-square'),false);
  assert.equal(city.crosswalks.length,chapter===2?8:7,'no extra asphalt crossings');
  const roads=new Set(city.roads),asphalt=new Set(city.busRoads),connected=connectedRoads(city);
  for(const [x,y] of [[20,20],[34,22]])for(let dx=0;dx<6;dx++)for(let dy=0;dy<6;dy++){
   const id=`${x+dx},${y+dy}`;
   assert.equal(roads.has(id),false,'walkway inside park '+id);
   assert.equal(asphalt.has(id),false,'asphalt inside park '+id);
  }
  for(let x=33;x<=40;x++){
   for(const y of [21,28]){
    assert.ok(roads.has(`${x},${y}`),'world-only walking ring '+x+','+y);
    assert.ok(connected.has(`${x},${y}`),'ring disconnected '+x+','+y);
   }
  }
  for(let y=21;y<=28;y++)for(const x of [33,40])assert.ok(roads.has(`${x},${y}`));
  for(let x=20;x<=26;x++)assert.ok(roads.has(`${x},26`),'centre south footpath missing');
  assert.equal(placeById('square').kind,PARK);
 }
});

test('P1 accepts the exact legacy balance missing only the new park, never unknown or other missing items',()=>{
 const spec=defaultWorldBalance();const old=structuredClone(spec);delete old.items[PARK];
 const restored=validateWorldBalance(old,{reachability:false});
 assert.deepEqual(restored.items[PARK],spec.items[PARK]);
 assert.deepEqual(restored.items['zeffi-central-square'],old.items['zeffi-central-square']);
 assert.equal(createWorldBalanceRuntime(restored).catalog[PARK].price.points,65000);
 const bad=structuredClone(old);delete bad.items.cottage;
 assert.throws(()=>validateWorldBalance(bad,{reachability:false}),/WORLD_BALANCE_INVALID/);
 const forged=structuredClone(old);forged.items['story-global-park-zeffi']={minCityLevel:1,price:{points:1,treats:0,coffee:0}};
 assert.throws(()=>validateWorldBalance(forged,{reachability:false}),/WORLD_BALANCE_INVALID/);
});
