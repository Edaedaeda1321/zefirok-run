import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {CATALOG, CATALOG_ITEMS} from '../catalog.js';
import {SPRITE_MANIFEST} from '../sprite-manifest.js';
import {catalogSpriteId, fallbackSpriteId, buildingAssetId, spriteMetadata} from '../sprite-assets.js';
import {makeInitialCity, addObject, moveObject, storeObject, restoreObject, sanitizeCity, dims} from '../engine.js';
const root=dirname(fileURLToPath(new URL('../index.html',import.meta.url)));
const flower=SPRITE_MANIFEST.assets.filter(a=>a.packId==='flower-style-v1');
const target={
  cottage:[2,2], 'family-home':[3,2], villa:[3,3],
  'coffee-kiosk':[2,2], 'coffee-house':[3,3], bakery:[3,2],
  fountain:[2,2], tree:[1,1],bench:[1,1],lamp:[1,1]
};

test('style pack contributes 40 independent images in 10 groups, not missing terrain',()=>{
 assert.equal(SPRITE_MANIFEST.assets.length,249);
 assert.equal(flower.length,40);
 assert.equal(CATALOG_ITEMS.length,41);
 assert.deepEqual(new Set(flower.map(a=>a.catalogId)),new Set(Object.keys(target)));
 assert.equal(existsSync(join(root,'assets/flower-style-v1/webp/terrain')),false);
 for(const a of flower){
  assert.ok(existsSync(join(root,a.fileWebp)),a.fileWebp);
  const header=readFileSync(join(root,a.fileWebp));
  assert.equal(header.toString('ascii',0,4),'RIFF');
  assert.equal(header.toString('ascii',8,12),'WEBP');
  assert.equal(Object.hasOwn(a,'filePng'),false);
  assert.ok(a.anchorX>0&&a.anchorX<a.width&&a.anchorY>0&&a.anchorY<a.height);
  const maxScale={bench:6.3,garden:4.7,playground:4.9,monument:4.5,fountain:4.2}[a.catalogId] ?? 4.1;
  assert.ok(a.assetScale>=2 && a.assetScale<=maxScale);
 }
});

test('all new sprites match original footprint including swapped rectangular rotations',()=>{
 for(const [kind,foot] of Object.entries(target)){
  const facings=[];
  for(let rot=0;rot<4;rot++){
   const sprite=catalogSpriteId(kind,rot);
   assert.ok(sprite.startsWith('flower_v1_'),`${kind}:${rot}`);
   const a=spriteMetadata(sprite);
   assert.equal(a.facing,'nesw'[rot]);
   assert.deepEqual(a.footprint,rot%2?[foot[1],foot[0]]:foot);
   assert.deepEqual(dims(CATALOG[kind],rot),{w:a.footprint[0],h:a.footprint[1]});
   facings.push(sprite);
  }
  assert.equal(new Set(facings).size,4);
 }
});

test('obsolete completed art is removed; existing Core construction stages still work',()=>{
 for(const kind of Object.keys(target)){
  for(let rot=0;rot<4;rot++){
   assert.ok(catalogSpriteId(kind,rot).startsWith('flower_v1_'));
   if(['cottage','family-home','villa','coffee-kiosk','coffee-house','bakery'].includes(kind)){
    assert.equal(buildingAssetId(kind,rot,'complete'),null);
   }
  }
 }
 for(const kind of ['cottage','family-home','villa','coffee-kiosk','coffee-house','bakery']){
  for(const stage of ['build_01','build_02','build_03']){
   const src=catalogSpriteId(kind,0,stage);
   assert.equal(src,buildingAssetId(kind,0,stage));
   assert.equal(spriteMetadata(src)?.state,stage);
  }
 }
});
test('style art stays compatible with paid ownership, saves, rotations and free relocation',()=>{
 let city=makeInitialCity();
 const oldWallet={...city.wallet};
 city=addObject(city,CATALOG,'bench',17,15,1);
 const uid=city.objects.at(-1).uid;
 city=moveObject(city,CATALOG,uid,17,17,2);
 city=storeObject(city,uid);
 city=restoreObject(city,CATALOG,uid,18,18,3);
 city=sanitizeCity(JSON.parse(JSON.stringify(city)),CATALOG);
 assert.equal(city.objects.at(-1).kind,'bench');
 assert.equal(city.objects.at(-1).rotation,3);
 assert.deepEqual(city.wallet,{points:oldWallet.points-CATALOG.bench.price.points,coffee:oldWallet.coffee-CATALOG.bench.price.coffee,treats:oldWallet.treats-CATALOG.bench.price.treats});
});
