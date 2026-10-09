import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG, CATALOG_ITEMS, CATEGORIES, RETIRED_PATH_ITEMS } from '../catalog.js';
import { ROAD_TILE_PRICE, OBJECT_PRICES } from '../economy.js';
import {
  makeInitialCity, cloneCity, addObject, applyRoadStroke, checkRoadStroke, roadStrokePrice,
  objectPrice, canAfford, moveObject, storeObject, restoreObject, sanitizeCity,
  buyParcel, expansionPrice, skipConstruction, BuildError, keyOf
} from '../engine.js';

const err=(callback,code)=>assert.throws(callback,e=>e instanceof BuildError&&e.code===code);
const beforeAfter=(old,price,newer)=>{
 for(const field of ['points','coffee','treats'])assert.equal(newer.wallet[field],old.wallet[field]-price[field],field);
};

test('the paid catalog includes 41 items with complete costs; paths are retired but saves are readable',()=>{
 assert.equal(CATALOG_ITEMS.length,41);
 assert.equal(Object.keys(OBJECT_PRICES).length,41);
 assert.equal(RETIRED_PATH_ITEMS.length,9);
 assert.equal(CATEGORIES.includes('paths'),false);
 assert.equal(CATALOG_ITEMS.some(i=>i.category==='paths'),false);
 for(const def of CATALOG_ITEMS){
  assert.deepEqual(objectPrice(CATALOG,def.id),OBJECT_PRICES[def.id]);
  assert.equal(Object.values(def.price).filter(Boolean).length>=1,true,def.id);
  assert.equal(Object.values(def.price).every(Number.isSafeInteger),true,def.id);
 }
 assert.equal(ROAD_TILE_PRICE.points,50);
});

test('each one of the three game currencies is charged correctly and only on a fresh purchase',()=>{
 for(const [kind,pos] of [['cottage',[16,18]],['coffee-house',[16,18]],['garden',[16,18]],['plaza-cozy-tiled',[16,18]],['extra-bush',[16,18]]]){
  const initial=makeInitialCity();
  const result=addObject(initial,CATALOG,kind,...pos,0,1800000000000);
  beforeAfter(initial,objectPrice(CATALOG,kind),result);
  assert.equal(initial.objects.length,4);assert.equal(result.objects.length,5);
  const uid=result.objects.at(-1).uid;
  let current=moveObject(result,CATALOG,uid,19,19,0);
  current=storeObject(current,uid);
  current=restoreObject(current,CATALOG,uid,19,19,0);
  assert.deepEqual(current.wallet,result.wallet,kind);
  assert.equal(current.objects.filter(o=>o.uid===uid).length,1);
  assert.deepEqual(sanitizeCity(JSON.parse(JSON.stringify(current)),CATALOG),current);
 }
});

test('insufficient points or coffee or treats stops a purchase without changing the city',()=>{
 for(const [kind,short] of [['cottage','points'],['cottage','treats'],['coffee-kiosk','coffee']]){
  const city=makeInitialCity();
  city.wallet[short]=objectPrice(CATALOG,kind)[short]-1;
  const snap=JSON.stringify(city);
  err(()=>addObject(city,CATALOG,kind,16,18),'INSUFFICIENT_BALANCE');
  assert.equal(JSON.stringify(city),snap);
 }
});

test('exact money pays the price, but never creates a negative balance',()=>{
 const city=makeInitialCity();
 const price=objectPrice(CATALOG,'bakery');
 city.wallet={...price};
 const built=addObject(city,CATALOG,'bakery',16,18,0,1800000000000);
 assert.deepEqual(built.wallet,{points:0,coffee:0,treats:0});
 err(()=>addObject(built,CATALOG,'bakery',19,19),'INSUFFICIENT_BALANCE');
 assert.equal(built.objects.length,5);
});

test('road charges only unique NEW tiles; existing road segments stay free',()=>{
 const initial=makeInitialCity();
 const stroke=[{x:15,y:13},{x:16,y:13},{x:17,y:13},{x:17,y:13}];
 assert.equal(checkRoadStroke(initial,CATALOG,stroke).ok,true);
 assert.deepEqual(roadStrokePrice(initial,stroke),{points:100,coffee:0,treats:0});
 const road=applyRoadStroke(initial,CATALOG,stroke);
 assert.equal(road.roads.length,11);
 assert.equal(road.wallet.points,initial.wallet.points-100);
 assert.equal(initial.roads.length,9);
 assert.deepEqual(roadStrokePrice(road,stroke),{points:0,coffee:0,treats:0});
 assert.deepEqual(applyRoadStroke(road,CATALOG,stroke),road);
});

test('insufficient road money rejects the WHOLE stroke, without placing partial tiles',()=>{
 const city=makeInitialCity();
 city.wallet.points=99;
 const stroke=[{x:16,y:13},{x:17,y:13}];
 const snap=JSON.stringify(city);
 err(()=>applyRoadStroke(city,CATALOG,stroke),'INSUFFICIENT_BALANCE');
 assert.equal(JSON.stringify(city),snap);
 assert.equal(canAfford(city.wallet,roadStrokePrice(city,stroke)),false);
});

test('road removal costs nothing and does not refund past purchases; starter Road stays locked',()=>{
 const original=makeInitialCity();
 const road=applyRoadStroke(original,CATALOG,[{x:16,y:13}]);
 const erased=applyRoadStroke(road,CATALOG,[{x:16,y:13}],{erasing:true});
 assert.equal(erased.wallet.points,road.wallet.points);
 assert.equal(erased.roads.includes('16,13'),false);
 err(()=>applyRoadStroke(erased,CATALOG,[{x:7,y:13}],{erasing:true}),'LOCKED_ROAD');
});

test('legacy decorative paths do not appear for purchase or gain functional road abilities',()=>{
 const city=makeInitialCity();
 const before=JSON.stringify(city);
 for(const retired of RETIRED_PATH_ITEMS){
  err(()=>addObject(city,CATALOG,retired.id,18,18),'NOT_AVAILABLE');
  assert.equal(CATALOG[retired.id].retired,true);
 }
 assert.equal(JSON.stringify(city),before);
 city.objects.push({uid:'obj-5',kind:'path-straight',x:18,y:19,rotation:0,level:1,stored:false,buildStartedAt:0,buildReadyAt:0});
 city.nextId=6;
 const restored=sanitizeCity(JSON.parse(JSON.stringify(city)),CATALOG);
 assert.equal(restored.roads.includes(keyOf(18,19)),false);
 assert.equal(restored.objects.at(-1).kind,'path-straight');
});

test('existing saved buildings and wallet load as-is, no retroactive charges',()=>{
 const legacy=makeInitialCity();
 const copy=cloneCity(legacy);
 const read=sanitizeCity(JSON.parse(JSON.stringify(copy)),CATALOG);
 assert.deepEqual(read,copy);
 assert.deepEqual(read.wallet,copy.wallet);
});

test('purchased land charges its prior cost without double-charging existing objects',()=>{
 const original=makeInitialCity();
 const price=expansionPrice(original);
 const next=buyParcel(original,6,2);
 beforeAfter(original,price,next);
 assert.deepEqual(next.objects,original.objects);
});

test('a decorative plaza may overlap Road, and old paving-over-road saves still load',()=>{
 let city=makeInitialCity();
 city=addObject(city,CATALOG,'plaza-cozy-tiled',16,16);
 city=applyRoadStroke(city,CATALOG,[{x:16,y:16}]);
 assert.equal(city.roads.includes('16,16'),true);
 assert.deepEqual(sanitizeCity(JSON.parse(JSON.stringify(city)),CATALOG),city);
});
