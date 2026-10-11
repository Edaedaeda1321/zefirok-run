import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import { CATALOG, CATEGORIES } from '../catalog.js';
import { OBJECT_PRICES } from '../economy.js';
import { SPRITE_MANIFEST } from '../sprite-manifest.js';
import { catalogSpriteId, buildingAssetId, spriteMetadata, preloadBuildFrames } from '../sprite-assets.js';
import {makeInitialCity, addObject, moveObject, storeObject, restoreObject, sanitizeCity, checkPlacement, dims, cityStats, isConstructing, constructionSkipPrice, BuildError} from '../engine.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const newPack=SPRITE_MANIFEST.assets.filter(item=>item.packId==='new-city-premium-sprites-v3-fixed');
const spec=Object.freeze({
 'bus-terminal':{w:4,h:3,category:'transport',points:27000,coffee:35,treats:50,building:true},
 'bus-stop':{w:2,h:1,category:'transport',points:5500,coffee:10,treats:0,building:true},
 'pond-park':{w:3,h:3,category:'parks',points:17500,coffee:0,treats:45},
 'rose-garden':{w:3,h:3,category:'parks',points:16000,coffee:0,treats:40},
 'botanical-garden':{w:4,h:4,category:'parks',points:32000,coffee:0,treats:75},
 'sports-playground':{w:3,h:2,category:'plazas',points:10800,coffee:0,treats:25},
 'city-square':{w:3,h:3,category:'plazas',points:12000,coffee:0,treats:25}
});
const names=Object.keys(spec);
test('seven real shop entries, fixed dimensions and priced three-currency quotes',()=>{
 assert.equal(names.length,7);
 assert.equal(CATEGORIES.includes('transport'),true);
 for(const [id,row] of Object.entries(spec)){
  assert.deepEqual([CATALOG[id].w,CATALOG[id].h],[row.w,row.h]);
  assert.equal(CATALOG[id].category,row.category);
  assert.equal(CATALOG[id].buildMs>0,true);
  assert.deepEqual(CATALOG[id].price,{points:row.points,coffee:row.coffee,treats:row.treats});
  assert.deepEqual(OBJECT_PRICES[id],CATALOG[id].price);
 }
});
test('112 unique WebP images: 4 true facings x 3 construction phases + 1 complete',()=>{
 assert.equal(newPack.length,112);
 assert.equal(new Set(newPack.map(x=>x.id)).size,112);
 for(const id of names){
  for(let rotation=0;rotation<4;rotation++){
   const expected=dims(CATALOG[id],rotation);
   for(const state of ['build_01','build_02','build_03','complete']){
    const sid=catalogSpriteId(id,rotation,state);
    assert.equal(sid,buildingAssetId(id,rotation,state),id+' '+rotation+' '+state);
    const image=spriteMetadata(sid);
    assert.equal(image.packId,'new-city-premium-sprites-v3-fixed');
    assert.equal(image.catalogId,id);
    assert.equal(image.state,state);
    assert.equal(image.facing,'nesw'[rotation]);
    assert.deepEqual(image.footprint,[expected.w,expected.h]);
    assert.equal(image.fileWebp.endsWith('.webp'),true);
    assert.equal(Object.hasOwn(image,'filePng'),false);
    const f=resolve(root,image.fileWebp);
    assert.equal(existsSync(f),true,f);
    const content=readFileSync(f);
    assert.equal(content.toString('ascii',0,4),'RIFF');
    assert.equal(content.toString('ascii',8,12),'WEBP');
   }
  }
 }
});
test('image-derived screen-space footprint fits every cell diamond in all 112 views',()=>{
 for(const a of newPack){
  const [w,h]=a.footprint;
  const layout={scale:a.assetScale,x:a.anchorX,y:a.anchorY};
  assert.ok(layout.scale>0&&Number.isFinite(layout.scale),a.id);
  assert.ok(a.anchorX>=0&&a.anchorX<=a.width&&a.anchorY>=0&&a.anchorY<=a.height,a.id);
  // The contact tip and the left/right base vertices are aligned with the grid.
  assert.ok(Math.abs((a.height-a.anchorY)/a.assetScale - (w+h)*18)<32,a.id);
  // Canvas includes up to 30px transparent padding; nominal sprite body
  // must not exceed its (w+h)*36 occupied baseline by huge dimensions.
  assert.ok(a.width/a.assetScale<(w+h)*36+100,a.id);
 }
});
test('server-authoritative purchases, rotation, store, restore and existing saves stay compatible',()=>{
 const before=makeInitialCity();
 const restored=sanitizeCity(JSON.parse(JSON.stringify(before)),CATALOG);
 assert.deepEqual(restored,before);
 for(const id of names){
  let city=makeInitialCity();city.wallet={points:999999,coffee:99999,treats:99999};
  const money={...city.wallet};
  const position=id==='botanical-garden'?[16,17]:[17,17];
  assert.equal(checkPlacement(city,CATALOG,id,...position,0).ok,true,id);
  city=addObject(city,CATALOG,id,...position,0,1700000000000);
  const price=OBJECT_PRICES[id];
  for(const c of ['points','coffee','treats'])assert.equal(city.wallet[c],money[c]-price[c],`${id} ${c}`);
  let item=city.objects.at(-1);
  assert.equal(isConstructing(item,1700000000000),true,id);
  assert.equal(item.kind,id);
  assert.equal(item.buildReadyAt-item.buildStartedAt,CATALOG[id].buildMs);
  city=moveObject(city,CATALOG,item.uid,19,18,1);
  city=storeObject(city,item.uid);
  city=restoreObject(city,CATALOG,item.uid,19,17,1);
  assert.equal(city.objects.at(-1).rotation,1);
  assert.deepEqual(sanitizeCity(JSON.parse(JSON.stringify(city)),CATALOG),city);
  for(const c of ['points','coffee','treats'])assert.equal(city.wallet[c],money[c]-price[c],id+' repeat charge');
 }
});
test('construction skip uses 70 coffee for transport and 50 for parks and squares',()=>{
 for(const id of names){
  const start=1700000000000;
  const item={kind:id,buildStartedAt:start,buildReadyAt:start+CATALOG[id].buildMs};
  assert.equal(constructionSkipPrice(item,start).coffee,id.startsWith('bus-')?70:50,id);
 }
});
test('new parks contribute comfort/visitors only after construction, and two-copy cap prevents population farming',()=>{
 const now=1700000000000;
 let city=makeInitialCity();city.wallet.points=999999;city.wallet.treats=99999;
 city=addObject(city,CATALOG,'pond-park',17,17,0,now);
 const current=cityStats(city,CATALOG,now);
 const future=cityStats(city,CATALOG,now+CATALOG['pond-park'].buildMs+1);
 assert.equal(future.comfort-current.comfort,24);
 assert.equal(future.population-current.population,2);
 city=addObject(city,CATALOG,'pond-park',14,18,0,now);
 city=addObject(city,CATALOG,'pond-park',10,18,0,now);
 const after=cityStats(city,CATALOG,now+CATALOG['pond-park'].buildMs+1);
 assert.equal(after.population-future.population,2,'only first two park copies add residents');
});
