import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {CATALOG, CATALOG_ITEMS, SHOP_UNLOCK_LEVELS} from '../catalog.js';
import {OBJECT_PRICES} from '../economy.js';
import {makeInitialCity,addObject,checkPlacement,cityStats,storeObject,restoreObject,sanitizeCity,constructionSkipPrice,isConstructing} from '../engine.js';
import {SPRITE_MANIFEST} from '../sprite-manifest.js';
import {buildingAssetId,catalogSpriteId,preloadBuildFrames,spriteMetadata} from '../sprite-assets.js';
import {worldSpriteVisualDock,TILE_W,TILE_H} from '../renderer.js';
import {STORY_CATALOG,buildStoryMap,validateStoryMap,placeById} from '../story/map.js';
import {createDemoState,contribute,setDemoChapter} from '../story/model.js';
import {requiredStorySpriteIds} from '../story/view.js';

const KIND='zeffi-central-square';
const id=i=>`zeffi_square_build_0${i}`;
const NOW=1_800_000_000_000;

test('RC7 preserves owned legacy 3x3 plaza and adds a separate purchasable 7x7 premium landmark',()=>{
 assert.deepEqual([CATALOG['city-square'].w,CATALOG['city-square'].h],[3,3]);
 assert.deepEqual([CATALOG[KIND].w,CATALOG[KIND].h],[7,7]);
 assert.equal(CATALOG[KIND].rotatable,false);
 assert.equal(CATALOG[KIND].buildMs,720_000);
 assert.equal(CATALOG[KIND].minCityLevel,8);
 assert.deepEqual(OBJECT_PRICES[KIND],{points:42000,coffee:0,treats:90});
 assert.equal(CATALOG_ITEMS.length,51);
 assert.equal(SHOP_UNLOCK_LEVELS[KIND],8);
});

test('RC7 real 7x7 footprint blocks roads/foreign objects and forbids forged rotations',()=>{
 let city=makeInitialCity();city.progress.bestLevel=10;
 city.wallet={points:100_000,treats:200,coffee:100};
 assert.equal(checkPlacement(city,CATALOG,KIND,18,18).code,'OUTSIDE_CITY');
 assert.equal(checkPlacement(city,CATALOG,KIND,9,5).code,'BUILDING_COLLISION');
 assert.equal(checkPlacement(city,CATALOG,KIND,12,12).code,'ROAD_COLLISION');
 assert.equal(checkPlacement(city,CATALOG,KIND,16,16,1).code,'INVALID_POSITION');
 assert.equal(checkPlacement(city,CATALOG,KIND,16,16,0).ok,true);
 const start={...city.wallet};city=addObject(city,CATALOG,KIND,16,16,0,NOW);
 assert.equal(city.objects.at(-1).kind,KIND);
 assert.equal(city.wallet.points,start.points-42000);
 assert.equal(city.wallet.treats,start.treats-90);
 assert.equal(city.objects.at(-1).buildReadyAt-NOW,720_000);
 assert.equal(isConstructing(city.objects.at(-1),NOW),true);
 assert.equal(isConstructing(city.objects.at(-1),NOW+720_000),false);
 assert.equal(constructionSkipPrice(city.objects.at(-1),NOW).coffee,50);
 const uid=city.objects.at(-1).uid;
 const saved={...city.wallet};city=storeObject(city,uid);
 city=restoreObject(city,CATALOG,uid,16,16,0);
 assert.deepEqual(city.wallet,saved);
 assert.deepEqual(sanitizeCity(JSON.parse(JSON.stringify(city)),CATALOG),city);
});

test('RC7 new purchase is level gated by shared engine and old progress cannot be reset',()=>{
 let city=makeInitialCity();city.wallet={points:200_000,coffee:100,treats:200};
 city.progress.bestLevel=7;
 assert.throws(()=>addObject(city,CATALOG,KIND,16,16,0,NOW),e=>e.code==='BUILDING_LEVEL_LOCKED');
 city.progress.bestLevel=8;
 city=addObject(city,CATALOG,KIND,16,16,0,NOW);
 assert.equal(city.progress.bestLevel,8);
 assert.equal(cityStats(city,CATALOG,NOW+720_001).comfort>=36,true);
});

test('RC7 single-angle pack has six different construction sprites, one complete, fixed scale and anchored ground fit',()=>{
 assert.equal(SPRITE_MANIFEST.assets.filter(a=>a.packId==='zeffi-central-square-v1').length,7);
 for(const index of [1,2,3,4,5,6]){
  const sprite=id(index),m=spriteMetadata(sprite);
  assert.equal(m?.state,`build_0${index}`);
  assert.deepEqual(m?.footprint,[7,7]);
  assert.equal(m?.directionVerified,false);
  assert.equal(m?.assetScale,1.89);
  assert.ok(Number.isFinite(worldSpriteVisualDock(m,CATALOG[KIND]).anchorX));
  const file=readFileSync(new URL('../'+m.fileWebp,import.meta.url));
  assert.equal(file.toString('ascii',0,4),'RIFF');
  assert.equal(file.toString('ascii',8,12),'WEBP');
  assert.ok(file.byteLength<280_000);
  assert.equal(buildingAssetId(KIND,0,'build_01',(index-1)/6),sprite);
 }
 assert.equal(buildingAssetId(KIND,0,'complete'),'zeffi_square_complete');
 assert.equal(catalogSpriteId(KIND),'zeffi_square_complete');
 assert.equal(spriteMetadata('zeffi_square_complete').width,1024);
});

test('RC7 old square remains players-only; shared story city displays completed 6x6 park; road network and fountains remain valid',()=>{
 for(const chapter of [0,1,2]){
  const state=setDemoChapter(createDemoState(),chapter);
  for(const funded of [false,true]){
   if(funded){state.project.community=1000;state.project.readyAt=1;state.project.startedAt=1;}
   const city=buildStoryMap(state,NOW);
   assert.deepEqual(validateStoryMap(city),[]);
   const square=city.objects.filter(o=>o.uid==='story-central-square');
   assert.equal(square.length,1);
   assert.equal(square[0].kind,'central-park-zeffi');
   assert.deepEqual([square[0].x,square[0].y],[20,20]);
   assert.equal(square[0].buildReadyAt,0);
   assert.ok(city.objects.some(o=>o.uid==='story-fountain'&&o.x===28&&o.y===24));
   const claimedRoads=new Set(city.roads);
   for(let x=20;x<26;x++)for(let y=20;y<26;y++)assert.ok(!claimedRoads.has(`${x},${y}`));
   assert.equal(city.objects.some(o=>o.kind==='city-square'),false);
  }
 }
 assert.equal(placeById('square').kind,'central-park-zeffi');
 assert.equal(placeById('square').uid,'story-central-square');
 assert.ok(requiredStorySpriteIds().includes('zeffi_park_complete_n'));
});
