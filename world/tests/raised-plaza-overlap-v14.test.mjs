import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CATALOG,CATALOG_ITEMS} from '../catalog.js';
import {makeInitialCity,addObject,storeObject,restoreObject,moveObject,applyRoadStroke,
 checkRoadStroke,checkPlacement,raisedSurfaceConflicts,sanitizeCity,cityStats,BuildError} from '../engine.js';
import {worldSpriteGroundFit} from '../renderer.js';
import {catalogSpriteId,spriteMetadata} from '../sprite-assets.js';

const PLAZAS=CATALOG_ITEMS.filter(def=>def.id.startsWith('plaza-'));
const OLD_LOCATION={x:18,y:18};
function oldOverlappingCity({raisedFirst=true,includeRoad=false}={}){
 // v13 let a 2x2 building occupy part of a raised 3x3 plaza in either order.
 let city=makeInitialCity();
 city=addObject(city,CATALOG,'plaza-monument-base',OLD_LOCATION.x,OLD_LOCATION.y);
 if(raisedFirst){
  city.objects.push({uid:`obj-${city.nextId++}`,kind:'cottage',x:19,y:19,rotation:0,level:1,stored:false,buildStartedAt:0,buildReadyAt:0});
 }else{
  const original=city.objects.pop();
  const newHouse={uid:`obj-${city.nextId++}`,kind:'cottage',x:19,y:19,rotation:0,level:1,stored:false,buildStartedAt:0,buildReadyAt:0};
  city.objects.push(newHouse,original);
 }
 if(includeRoad)city.roads.push('18,18');
 return city;
}

test('all eight precomposed raised plazas are recognized, flat paving retains separate semantics',()=>{
 assert.equal(PLAZAS.length,8);
 for(const item of PLAZAS){
  assert.equal(item.layer,'surface',item.id);
  assert.equal(item.blockingSurface,true,item.id);
 }
 assert.notEqual(CATALOG['terrain_platform_plain_premium'].blockingSurface,true);
});

test('cannot build on a 3D plaza postament in either purchase order or add roads through its fixtures',()=>{
 let city=makeInitialCity();
 city=addObject(city,CATALOG,'plaza-monument-base',18,18);
 for(const kind of ['cottage','family-home','monument','tree','plaza-rest-zone']){
  assert.equal(checkPlacement(city,CATALOG,kind,19,19).code,'BUILDING_COLLISION',kind);
 }
 assert.equal(checkRoadStroke(city,CATALOG,[{x:19,y:19}]).code,'BUILDING_COLLISION');
 assert.throws(()=>applyRoadStroke(city,CATALOG,[{x:19,y:19}]),e=>e instanceof BuildError&&e.code==='BUILDING_COLLISION');
 let other=makeInitialCity();
 other=addObject(other,CATALOG,'cottage',19,19);
 assert.equal(checkPlacement(other,CATALOG,'plaza-monument-base',18,18).code,'BUILDING_COLLISION');
 // The same is true of rotated structures and other 3D scene elements.
 assert.equal(checkPlacement(other,CATALOG,'plaza-monument-base',18,18,1).code,'BUILDING_COLLISION');
});

test('legacy saves containing a raised plaza under a house and/or road still open unchanged',()=>{
 for(const raisedFirst of [true,false])for(const includeRoad of [true,false]){
  const city=oldOverlappingCity({raisedFirst,includeRoad});
  const initial=JSON.stringify(city);
  const beforeWallet={...city.wallet};
  const restored=sanitizeCity(JSON.parse(initial),CATALOG);
  assert.deepEqual(restored,JSON.parse(initial));
  assert.deepEqual(restored.wallet,beforeWallet);
  const clashes=raisedSurfaceConflicts(restored,CATALOG);
  assert.equal(clashes.length,1);
  assert.equal(clashes[0].kind,'plaza-monument-base');
  assert.equal(clashes[0].building,true);
  assert.equal(clashes[0].road,includeRoad);
  assert.equal(cityStats(restored,CATALOG).cityLevel>=1,true);
 }
});

test('owners may remove the intersecting plaza to warehouse at no charge and restore to clear land',()=>{
 const city=sanitizeCity(oldOverlappingCity({includeRoad:true}),CATALOG);
 const conflict=raisedSurfaceConflicts(city,CATALOG);
 assert.equal(conflict.length,1);
 const stored=storeObject(city,conflict[0].uid);
 assert.deepEqual(stored.wallet,city.wallet);
 assert.equal(raisedSurfaceConflicts(stored,CATALOG).length,0);
 assert.equal(stored.objects.find(item=>item.uid===conflict[0].uid).stored,true);
 assert.equal(stored.objects.some(item=>item.kind==='cottage'&&!item.stored),true);
 assert.equal(checkPlacement(stored,CATALOG,'plaza-monument-base',19,19).code,'BUILDING_COLLISION');
 const clean=restoreObject(stored,CATALOG,conflict[0].uid,21,18);
 assert.equal(raisedSurfaceConflicts(clean,CATALOG).length,0);
 assert.deepEqual(clean.wallet,city.wallet);
 assert.equal(clean.objects.length,city.objects.length);
 assert.throws(()=>moveObject(clean,CATALOG,conflict[0].uid,18,18),e=>e.code==='ROAD_COLLISION');
});

test('the vertical plaza is rendered in the depth-sorted 3D painter, not as flat background',()=>{
 const js=readFileSync(new URL('../renderer.js',import.meta.url),'utf8');
 assert.match(js,/catalog\[o\.kind\]\?\.layer==='surface' && !catalog\[o\.kind\]\?\.blockingSurface/);
 assert.match(js,/catalog\[o\.kind\]\?\.layer!=='surface'\|\|catalog\[o\.kind\]\?\.blockingSurface/);
 for(const kind of ['plaza-monument-base','plaza-cozy-tiled','plaza-rest-zone']){
  const meta=spriteMetadata(catalogSpriteId(kind,0));
  const p=worldSpriteGroundFit(meta,CATALOG[kind],0);
  assert.ok(p?.assetScale>0,kind);
  assert.ok(Number.isFinite(p?.anchorY),kind);
 }
});

test('the mobile game visibly offers a safe repair UI rather than silently deleting old decorations',()=>{
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(app,/raisedSurfaceConflicts\(state\.city,CATALOG\)/);
 assert.match(app,/performServerAction\('store',\{uid:item\.uid\}\)/);
 assert.match(app,/Убрать перекрытые площади на склад/);
 assert.match(app,/world-raised-conflict/);
});
