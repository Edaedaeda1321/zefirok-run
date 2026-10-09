import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG, CATALOG_ITEMS} from '../catalog.js';
import {makeInitialCity,addObject,moveObject,storeObject,restoreObject,isConstructing,constructionRemaining,cityStats,sanitizeCity,cloneCity,BuildError} from '../engine.js';
const fresh=()=>makeInitialCity();
test('all houses and shops have meaningful construction durations while decorations are instant',()=>{
 for(const kind of ['cottage','family-home','villa','coffee-kiosk','coffee-house','bakery','flower-shop'])assert.ok(CATALOG[kind].buildMs>=20000);
 for(const kind of ['tree','flowerbed','bench'])assert.equal(CATALOG[kind].buildMs||0,0);
 for(const kind of ['garden','playground','fountain','extra-fountain','monument'])assert.ok(CATALOG[kind].buildMs>=20000);
});
test('start placing schedules construction but does not produce instant ready building',()=>{
 const now=1800000000000;
 const city=addObject(fresh(),CATALOG,'coffee-house',17,17,0,now);
 const item=city.objects.at(-1);
 assert.equal(item.buildStartedAt,now);
 assert.equal(item.buildReadyAt,now+CATALOG['coffee-house'].buildMs);
 assert.equal(isConstructing(item,now),true);
 assert.equal(constructionRemaining(item,now+4000),CATALOG['coffee-house'].buildMs-4000);
 assert.equal(cityStats(city,CATALOG,now).constructing,1);
 assert.equal(cityStats(city,CATALOG,item.buildReadyAt).constructing,0);
 assert.equal(isConstructing(item,item.buildReadyAt),false);
});
test('decorative objects appear instantly',()=>{
 const city=addObject(fresh(),CATALOG,'flowerbed',16,18,0,1800000000000);
 assert.equal(city.objects.at(-1).buildReadyAt,0);
 assert.equal(isConstructing(city.objects.at(-1)),false);
});
test('build countdown survives storage, movement and JSON save',()=>{
 const now=1800000000000;
 let city=addObject(fresh(),CATALOG,'villa',16,16,0,now);
 const item=city.objects.at(-1);
 city=moveObject(city,CATALOG,item.uid,17,15,0);
 city=storeObject(city,item.uid);
 assert.equal(city.objects.at(-1).buildReadyAt,now+CATALOG.villa.buildMs);
 city=restoreObject(city,CATALOG,item.uid,16,16,0);
 city=sanitizeCity(JSON.parse(JSON.stringify(city)),CATALOG);
 assert.equal(city.objects.at(-1).buildReadyAt,now+CATALOG.villa.buildMs);
 assert.equal(isConstructing(city.objects.at(-1),now+3000),true);
});
test('legacy v0.1 saves load safely with completed buildings',()=>{
 const city=cloneCity(fresh());
 for(const item of city.objects){delete item.buildStartedAt;delete item.buildReadyAt;}
 const old=JSON.parse(JSON.stringify(city));
 const restored=sanitizeCity(old,CATALOG);
 assert.deepEqual(restored.objects.map(x=>x.buildReadyAt),[0,0,0,0]);
 assert.equal(cityStats(restored,CATALOG).constructing,0);
});
test('save validator rejects invalid timestamps and excessive duration',()=>{
 const now=1800000000000;
 const city=addObject(fresh(),CATALOG,'bakery',17,17,0,now);
 for(const v of [-1,'unknown',5.5,Number.MAX_SAFE_INTEGER,NaN]){
  const bad=cloneCity(city);bad.objects.at(-1).buildReadyAt=v;
  assert.throws(()=>sanitizeCity(bad,CATALOG),e=>e instanceof BuildError&&e.code==='INVALID_SAVE');
 }
});
test('finished city remains ready when reopened after the timestamp',()=>{
 const now=1800000000000;
 const city=addObject(fresh(),CATALOG,'cottage',17,17,0,now);
 const reloaded=sanitizeCity(JSON.parse(JSON.stringify(city)),CATALOG);
 assert.equal(isConstructing(reloaded.objects.at(-1),now+CATALOG.cottage.buildMs+1),false);
 assert.equal(cityStats(reloaded,CATALOG,now+CATALOG.cottage.buildMs+1).constructing,0);
});
