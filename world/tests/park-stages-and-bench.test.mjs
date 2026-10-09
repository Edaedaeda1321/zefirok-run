import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {CATALOG} from '../catalog.js';
import {makeInitialCity, addObject, moveObject, dims, checkPlacement, sanitizeCity, isConstructing, expansionPrice, buyParcel, BuildError} from '../engine.js';
import {SPRITE_MANIFEST} from '../sprite-manifest.js';
import {catalogSpriteId, parkConstructionAssetId, spriteMetadata} from '../sprite-assets.js';
const root=fileURLToPath(new URL('../',import.meta.url));
test('both flower style benches truly occupy a 1x1 cell in every rotation',()=>{
 for(const kind of ['bench','extra-bench']){
  assert.deepEqual([CATALOG[kind].w,CATALOG[kind].h],[1,1]);
  for(let rot=0;rot<4;rot++){
   assert.deepEqual(dims(CATALOG[kind],rot),{w:1,h:1});
   const m=spriteMetadata(catalogSpriteId(kind,rot));
   assert.deepEqual(m.footprint,[1,1]);
   assert.ok(m.width/m.assetScale<72,'bench exceeds one tile width');
  }
 }
 let city=addObject(makeInitialCity(),CATALOG,'bench',17,17);
 assert.equal(checkPlacement(city,CATALOG,'extra-bench',18,17).ok,true);
 const oldSave=sanitizeCity(JSON.parse(JSON.stringify(city)),CATALOG);
 assert.equal(oldSave.objects.at(-1).kind,'bench');
 assert.deepEqual(oldSave.wallet,city.wallet);
});
test('48 separate WebP park construction sprites cover 3 stages and all directions',()=>{
 const stages=SPRITE_MANIFEST.assets.filter(a=>a.packId==='park-construction-v1');
 assert.equal(stages.length,48);
 const kinds=['garden','playground','fountain','monument'];
 for(const kind of kinds)for(let rot=0;rot<4;rot++)for(const state of ['build_01','build_02','build_03']){
  const id=parkConstructionAssetId(kind,rot,state);
  assert.ok(id,`${kind}/${rot}/${state}`);
  assert.equal(catalogSpriteId(kind,rot,state),id);
  const a=spriteMetadata(id);
  assert.equal(a.state,state);
  assert.deepEqual(a.footprint,Object.values(dims(CATALOG[kind],rot)));
  assert.equal(a.facing,'nesw'[rot]);
  assert.ok(existsSync(resolve(root,a.fileWebp)),a.fileWebp);
  assert.ok(a.anchorX>=0&&a.anchorX<=a.width);
  assert.ok(a.anchorY>=0&&a.anchorY<=a.height);
 }
 for(let rot=0;rot<4;rot++)for(const stage of ['build_01','build_02','build_03']){
  assert.equal(parkConstructionAssetId('extra-fountain',rot,stage),parkConstructionAssetId('fountain',rot,stage));
 }
});
test('park/fountain/monument construction timers survive save; adjacent parks cannot share occupied tiles',()=>{
 let city=makeInitialCity();const now=1800000000000;
 for(const kind of ['garden','playground','fountain','monument','extra-fountain']){
  const pos={garden:[16,16],playground:[20,16],fountain:[16,20],monument:[19,20],'extra-fountain':[21,21]}[kind];
  city=addObject(city,CATALOG,kind,...pos,0,now);
  assert.equal(isConstructing(city.objects.at(-1),now),true);
 }
 assert.equal(checkPlacement(city,CATALOG,'garden',17,17).code,'BUILDING_COLLISION');
 const saved=sanitizeCity(JSON.parse(JSON.stringify(city)),CATALOG);
 assert.deepEqual(saved,city);
});
test('extremely large parcel pricing cannot overflow or accidentally charge unsafe integers',()=>{
 const city=makeInitialCity();
 city.parcels=Array.from({length:100},(_,i)=>`${6+i},0`);
 const price=expansionPrice(city);
 assert.equal(price.unavailable,true);
 assert.ok(Number.isSafeInteger(price.points));
});
