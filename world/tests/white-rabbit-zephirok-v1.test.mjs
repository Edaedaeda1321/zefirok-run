import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { CATALOG, CATALOG_ITEMS } from '../catalog.js';
import { OBJECT_PRICES } from '../economy.js';
import { CITY_LEVELS, makeInitialCity, addObject, cloneCity, moveObject, storeObject, restoreObject, sanitizeCity, buildingEffectPreview, BuildError } from '../engine.js';
import { catalogSpriteId, spriteMetadata } from '../sprite-assets.js';
import { SPRITE_MANIFEST } from '../sprite-manifest.js';
import { buildStoryMap, validateStoryMap, DISTRICTS, placeById, lockedDistricts, isPlaceOpen } from '../story/map.js';
import { requiredStorySpriteIds, centerCamera } from '../story/view.js';
import { createDemoState, setDemoChapter } from '../story/model.js';
const id='white-rabbit-zephirok';
const error=(code)=>(e)=>e instanceof BuildError&&e.code===code;
const rich=(level=10)=>{const city=makeInitialCity();city.progress.bestLevel=level;city.wallet={points:200000,coffee:300,treats:500};return city;};
const now=1800000000000;

test('white rabbit: one premium 4x4 shop at the new prestige level 10',()=>{
 assert.equal(CITY_LEVELS.at(-1).level,10);
 assert.equal(CATALOG[id].category,'shops');
 assert.equal(CATALOG[id].w,4);assert.equal(CATALOG[id].h,4);
 assert.equal(CATALOG[id].needsRoad,true);
 assert.equal(CATALOG[id].minCityLevel,10);
 assert.equal(CATALOG_ITEMS.filter(x=>x.id===id).length,1);
 assert.deepEqual(OBJECT_PRICES[id],{points:120000,coffee:0,treats:300});
 assert.deepEqual(buildingEffectPreview(CATALOG[id]),{population:5,comfort:48,needsRoad:true,limitedPopulation:false});
});
for(const level of [1,2,3,4,5,6,7,8,9])test(`white rabbit: city level ${level} cannot purchase and wallet stays unchanged`,()=>{
 const city=rich(level),before=JSON.stringify(city);
 assert.throws(()=>addObject(city,CATALOG,id,16,18,0,now),error('BUILDING_LEVEL_LOCKED'));
 assert.equal(JSON.stringify(city),before);
});
test('white rabbit: exact price, 15 minute timer, no free credit and no double debit',()=>{
 const city=rich();city.wallet={...OBJECT_PRICES[id]};
 const bought=addObject(city,CATALOG,id,16,18,0,now);
 assert.deepEqual(city.wallet,{...OBJECT_PRICES[id]});
 assert.deepEqual(bought.wallet,{points:0,coffee:0,treats:0});
 const building=bought.objects.at(-1);
 assert.equal(building.kind,id);
 assert.equal(building.buildReadyAt-building.buildStartedAt,900000);
 assert.throws(()=>addObject(bought,CATALOG,id,20,18,0,now),error('INSUFFICIENT_BALANCE'));
 assert.deepEqual(bought.wallet,{points:0,coffee:0,treats:0});
});
test('white rabbit: moving, rotating, storing and restoring an owned prestige building is free',()=>{
 let city=rich();city=addObject(city,CATALOG,id,16,18,0,now);
 const uid=city.objects.at(-1).uid,wallet={...city.wallet};
 city=moveObject(city,CATALOG,uid,17,18,1);
 city=storeObject(city,uid);
 city.progress.bestLevel=1; // a legacy save, ownership stays valid
 city=restoreObject(city,CATALOG,uid,16,18,2);
 assert.deepEqual(city.wallet,wallet);
 assert.equal(city.objects.find(x=>x.uid===uid).rotation,2);
 assert.deepEqual(sanitizeCity(JSON.parse(JSON.stringify(city)),CATALOG),city);
});
test('white rabbit: 4 separately loaded WebP variants, review-only direction metadata, correct ground fit',()=>{
 const ids=[];const disk=JSON.parse(readFileSync(new URL('../assets/manifest.json',import.meta.url),'utf8'));
 for(let rotation=0;rotation<4;rotation++){
  const spriteId=catalogSpriteId(id,rotation);ids.push(spriteId);
  const meta=spriteMetadata(spriteId);
  assert.ok(meta&&meta.catalogId===id);
  assert.equal(meta.directionVerified,false); // do not silently certify unverified 90-degree rotations
  assert.deepEqual(meta.footprint,[4,4]);
  assert.equal(meta.width,896);assert.equal(meta.height,896);
  assert.ok(meta.assetScale>2&&meta.assetScale<4);
  assert.equal(meta.fileWebp.startsWith('assets/white-rabbit-zephirok-v1/'),true);
  const source=new URL('../'+meta.fileWebp,import.meta.url);
  assert.ok(existsSync(source),spriteId);
  const webp=readFileSync(source);assert.equal(webp.toString('ascii',0,4),'RIFF');assert.equal(webp.toString('ascii',8,12),'WEBP');
  assert.ok(webp.length>25000&&webp.length<280000,'mobile asset budget '+spriteId);
  assert.deepEqual(disk.assets.find(x=>x.id===spriteId),meta);
 }
 assert.equal(new Set(ids).size,4);
 assert.equal(SPRITE_MANIFEST.assets.filter(a=>!['park-belkino-story-v1','white-rabbit-construction-v1','story-festival-hall-v1','zeffi-central-square-v1'].includes(a.packId)).length,365);
 assert.equal(SPRITE_MANIFEST.assets.filter(a=>a.packId==='park-belkino-story-v1').length,4);
 assert.equal(SPRITE_MANIFEST.assets.filter(a=>a.packId==='white-rabbit-construction-v1').length,6);
 assert.equal(SPRITE_MANIFEST.assets.filter(a=>a.packId==='story-festival-hall-v1').length,16);
 assert.equal(SPRITE_MANIFEST.assets.filter(x=>x.catalogId===id&&x.state==='complete').length,4);
 assert.deepEqual(SPRITE_MANIFEST.assets.filter(x=>x.catalogId===id&&x.packId==='white-rabbit-construction-v1').map(x=>x.state).sort(),['build_01','build_02','build_03','build_04','build_05','build_06']);
 assert.ok(requiredStorySpriteIds().includes(ids[0]));
});
for(const chapter of [0,1,2])test(`white rabbit: ONE shared physical site in chapter ${chapter} and two distinct story markers`,()=>{
 const state=setDemoChapter(createDemoState(),chapter);
 const city=buildStoryMap(state);
 assert.deepEqual(validateStoryMap(city),[]);
 const physical=city.objects.filter(o=>o.kind===id);
 assert.equal(physical.length,1);
 assert.equal(physical[0].uid,'story-cafe');
 assert.deepEqual([physical[0].x,physical[0].y],[9,9]);
 assert.equal(city.objects.some(o=>o.uid==='story-rabbit'),false);
 const cafe=placeById('cafe'),rabbit=placeById('rabbit');
 assert.equal(cafe.uid,'story-cafe');assert.equal(rabbit.uid,'story-cafe');
 assert.equal(cafe.kind,id);assert.equal(rabbit.kind,id);
 assert.equal(isPlaceOpen(cafe,state),true);
 assert.equal(isPlaceOpen(rabbit,state),chapter===2);
 assert.equal(lockedDistricts(state).some(d=>d.id==='rabbit'),false);
 assert.ok(rabbit.focus[0]>=9&&rabbit.focus[0]<13&&rabbit.focus[1]>=9&&rabbit.focus[1]<13);
 const cam=centerCamera(...cafe.focus,.95);
 const spread=(rabbit.focus[0]-rabbit.focus[1] - cafe.focus[0] + cafe.focus[1])*36*cam.zoom;
 assert.ok(spread>80&&spread<125,'two pins must stay apart and on a mobile map');
});
test('white rabbit: normal player shop and story scene load the SAME one catalog ID',()=>{
 const worker=readFileSync(new URL('../../src/zeffi-world-service.js',import.meta.url),'utf8');
 assert.match(worker,/addObject\(city,catalog/);
 assert.match(worker,/publishedWorldEconomy/);
 const catalog=readFileSync(new URL('../catalog.js',import.meta.url),'utf8');
 assert.match(catalog,/SHOP_UNLOCK_LEVELS/);
 const story=readFileSync(new URL('../story/map.js',import.meta.url),'utf8');
 for(let preview=0;preview<=6;preview++){
  const snapshot={...createDemoState(),whiteRabbitPreview:preview};
  const map=buildStoryMap(snapshot);
  const cafe=map.objects.filter(o=>o.uid==='story-cafe');
  assert.equal(cafe.length,1,`one shared building in White Rabbit stage ${preview}`);
  assert.equal(cafe[0].kind,preview===0?id:`story-wr-stage-${preview}`);
  assert.deepEqual([cafe[0].x,cafe[0].y],[9,9]);
  assert.deepEqual(validateStoryMap(map),[]);
 }
 assert.doesNotMatch(story,/place\('villa',35,25,0,'story-rabbit'\)/);
});
