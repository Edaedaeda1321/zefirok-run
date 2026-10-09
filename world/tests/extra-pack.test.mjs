import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CATALOG, CATALOG_ITEMS, CATEGORIES, RETIRED_PATH_ITEMS } from '../catalog.js';
import { SPRITE_MANIFEST } from '../sprite-manifest.js';
import { catalogSpriteId, spriteMetadata, spriteStatus } from '../sprite-assets.js';
import { makeInitialCity, addObject, checkPlacement, findOccupant, checkRoadStroke, applyRoadStroke, moveObject, storeObject, restoreObject, sanitizeCity, keyOf, BuildError } from '../engine.js';
const root=dirname(fileURLToPath(new URL('../index.html',import.meta.url)));
const extras=SPRITE_MANIFEST.assets.filter(a=>a.packId==='extra-v1');

test('extra pack retains 39 necessary WebP images; superseded decor was removed',()=>{
 assert.equal(extras.length,39);
 assert.equal(new Set(extras.map(a=>a.id)).size,39);
 for(const a of extras){
  assert.equal(Object.hasOwn(a,'filePng'),false,a.id);
  assert.ok(existsSync(join(root,a.fileWebp)),a.fileWebp);
  assert.ok(a.width>0&&a.height>0&&a.assetScale>=2&&a.assetScale<=6.1);
  assert.ok(a.anchorX>=0&&a.anchorX<=a.width);
  assert.ok(a.anchorY>=0&&a.anchorY<=a.height);
  assert.deepEqual(spriteMetadata(a.id),a);
 }
});

test('missing 4 major objects now have 4 separately authored directions without altering their original footprints',()=>{
 const sizes={'flower-shop':[2,2],garden:[3,3],playground:[3,2],monument:[2,2]};
 for(const [kind,size] of Object.entries(sizes)){
  assert.deepEqual([CATALOG[kind].w,CATALOG[kind].h],size);
  const sprites=new Set();
  for(let r=0;r<4;r++){
   const id=catalogSpriteId(kind,r);
   assert.ok(id,`${kind} ${r}`);
   assert.equal(spriteMetadata(id)?.catalogId,kind);
   sprites.add(id);
  }
  assert.equal(sprites.size,4);
 }
});

test('9 deprecated decorative paths are hidden but remain readable, while plazas and small decor are purchasable',()=>{
 const paths=CATALOG_ITEMS.filter(x=>x.category==='paths');
 const plazas=CATALOG_ITEMS.filter(x=>x.category==='plazas');
 const decor=CATALOG_ITEMS.filter(x=>x.id.startsWith('extra-'));
 assert.equal(paths.length,0);assert.equal(RETIRED_PATH_ITEMS.length,9);assert.equal(plazas.length,8);assert.equal(decor.length,10);
 assert.deepEqual(RETIRED_PATH_ITEMS.map(x=>x.layer),Array(9).fill('surface'));
 assert.deepEqual(plazas.map(x=>x.layer),Array(8).fill('surface'));
 assert.ok(!CATEGORIES.includes('paths')&&CATEGORIES.includes('plazas'));
 for(const def of [...RETIRED_PATH_ITEMS,...plazas,...decor]){
  const id=catalogSpriteId(def.id,0);
  assert.ok(id,def.id);
  if(['extra-tree','extra-lamp','extra-bench','extra-fountain'].includes(def.id)) {
   assert.equal(spriteMetadata(id).catalogId,({'extra-tree':'tree','extra-lamp':'lamp','extra-bench':'bench','extra-fountain':'fountain'})[def.id]);
   assert.ok(id.startsWith('flower_v1_'));
  } else assert.equal(spriteMetadata(id).catalogId,def.id);
  if(def.id==='extra-fountain') assert.ok(def.buildMs>=20000);
  else assert.equal(def.buildMs||0,0);
 }
});

test('paid decorative paving can sit below buildings without changing real road connectivity',()=>{
 let city=makeInitialCity();
 const oldWallet=structuredClone(city.wallet), originalRoads=[...city.roads];
 city=addObject(city,CATALOG,'plaza-monument-base',16,17);
 city=addObject(city,CATALOG,'monument',17,18);
 assert.equal(city.objects.at(-1).kind,'monument');
 assert.equal(findOccupant(city,CATALOG,17,18).kind,'monument');
 assert.equal(checkPlacement(city,CATALOG,'extra-flowerbed',16,17).ok,true);
 assert.equal(checkPlacement(city,CATALOG,'extra-tree',17,18).code,'BUILDING_COLLISION');
 assert.equal(checkPlacement(city,CATALOG,'plaza-city-square',17,18).code,'BUILDING_COLLISION');
 assert.deepEqual(city.roads,originalRoads);
 assert.deepEqual(city.wallet,{points:oldWallet.points-CATALOG['plaza-monument-base'].price.points-CATALOG.monument.price.points,coffee:oldWallet.coffee,treats:oldWallet.treats-CATALOG['plaza-monument-base'].price.treats-CATALOG.monument.price.treats});
 city=sanitizeCity(JSON.parse(JSON.stringify(city)),CATALOG);
 assert.equal(city.objects.filter(x=>x.kind==='plaza-monument-base').length,1);
});

test('retired path cannot be bought, old owned path survives saves, moving and storage',()=>{
 let city=makeInitialCity();
 assert.throws(()=>addObject(city,CATALOG,'path-straight',18,13),e=>e instanceof BuildError&&e.code==='NOT_AVAILABLE');
 // Simulate an old local v0.1.2 save with a previously owned decorative path.
 city.objects.push({uid:'obj-5',kind:'path-straight',x:18,y:13,rotation:0,level:1,stored:false,buildStartedAt:0,buildReadyAt:0});
 city.nextId=6;
 city=sanitizeCity(JSON.parse(JSON.stringify(city)),CATALOG);
 const uid=city.objects.at(-1).uid;
 assert.ok(!city.roads.includes(keyOf(18,13)));
 assert.equal(checkRoadStroke(city,CATALOG,[{x:17,y:13},{x:18,y:13}]).ok,true);
 city=applyRoadStroke(city,CATALOG,[{x:15,y:13},{x:16,y:13},{x:17,y:13},{x:18,y:13}]);
 assert.ok(city.roads.includes('18,13'));
 city=moveObject(city,CATALOG,uid,18,16,0);
 city=storeObject(city,uid);
 city=restoreObject(city,CATALOG,uid,20,20,0);
 assert.equal(city.objects.at(-1).kind,'path-straight');
 assert.equal(city.objects.at(-1).rotation,0);
});

test('the new building art replaces complete views while Core 3-stage construction remains',()=>{
 for(const kind of ['cottage','family-home','villa','coffee-kiosk','coffee-house','bakery']){
  assert.ok(catalogSpriteId(kind,0)?.startsWith('flower_v1_'));
  assert.ok(catalogSpriteId(kind,0,'build_01')?.startsWith('world_'));
 }
 assert.equal(catalogSpriteId('flower-shop',0,'build_01'),null);
 for(const kind of ['garden','playground'])assert.ok(catalogSpriteId(kind,0,'build_01')?.startsWith('park_'));
});
