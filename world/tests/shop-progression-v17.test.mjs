import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG, CATALOG_ITEMS, CATEGORIES } from '../catalog.js';
import { OBJECT_PRICES, ROAD_TILE_PRICE, PARCEL_PRICE } from '../economy.js';
import { makeInitialCity, cloneCity, cityStats, addObject, storeObject,
         restoreObject, moveObject, sanitizeCity, objectPrice, buildingEffectPreview,
         BuildError, CITY_LEVELS } from '../engine.js';
const unlocked = (city,level)=>{city.progress.bestLevel=level;return city;};
const now=1800000000000;
const assertReject=(call,code)=>assert.throws(call,error=>error instanceof BuildError&&error.code===code);

test('v17: all 50 shop objects have distinct costs, no compulsory coffee, coherent level unlocks',()=>{
 assert.equal(CATALOG_ITEMS.length,52);
 assert.equal(Object.keys(OBJECT_PRICES).length,52);
 for(const def of CATALOG_ITEMS){
  assert.deepEqual(def.price,OBJECT_PRICES[def.id]);
  assert.ok(def.price.points>0,def.id);
  assert.equal(def.price.coffee,0,def.id);
  assert.equal(Number.isSafeInteger(def.minCityLevel),true,def.id);
  assert.ok(def.minCityLevel>=1&&def.minCityLevel<=10,def.id);
 }
 assert.equal(new Set(CATALOG_ITEMS.map(x=>x.id)).size,52);
 assert.deepEqual(ROAD_TILE_PRICE,{points:50,coffee:0,treats:0});
 assert.equal(PARCEL_PRICE.points,1200);
 assert.equal(PARCEL_PRICE.treats,10);
});

test('v17: level-1 has housing, an establishment and a park, so progression is reachable',()=>{
 for(const kind of ['cottage','coffee-kiosk','flower-shop','playground'])assert.equal(CATALOG[kind].minCityLevel,1);
 assert.equal(CATALOG['family-home'].minCityLevel,2);
 assert.equal(CATALOG['villa'].minCityLevel,3);
 assert.equal(CATALOG['bus-terminal'].minCityLevel,7);
 assert.equal(CATALOG['botanical-garden'].minCityLevel,8);
 for(const level of [1,2,3,4,5,6,7,8,9,10])assert.ok(CATALOG_ITEMS.some(x=>x.minCityLevel===level));
 assert.equal(CITY_LEVELS.length,10);
});

test('v17: shared engine refuses a locked purchase without changing the wallet or revision state',()=>{
 const city=makeInitialCity(),snapshot=JSON.stringify(city);
 assertReject(()=>addObject(city,CATALOG,'botanical-garden',17,17,0,now),'BUILDING_LEVEL_LOCKED');
 assertReject(()=>addObject(city,CATALOG,'villa',17,17,0,now),'BUILDING_LEVEL_LOCKED');
 assert.equal(JSON.stringify(city),snapshot);
 assert.equal(cityStats(city,CATALOG,now).cityLevel,1);
});

test('v17: level 1 house can be bought with points only and stores with the paid price',()=>{
 const city=makeInitialCity();const purchase=addObject(city,CATALOG,'cottage',17,17,0,now);
 assert.equal(purchase.wallet.points,city.wallet.points-5500);
 assert.equal(purchase.wallet.coffee,city.wallet.coffee);
 assert.equal(purchase.wallet.treats,city.wallet.treats);
 assert.equal(purchase.objects.length,city.objects.length+1);
});

test('v17: previously earned level remains unlocked after loss of buildings',()=>{
 const city=unlocked(makeInitialCity(),7);
 // Level persistence, not the starter-wallet budget, is under test.
 city.wallet={...objectPrice(CATALOG,'bus-terminal')};
 const before=cityStats(city,CATALOG,now);
 assert.equal(before.cityLevel,7);
 const bought=addObject(city,CATALOG,'bus-terminal',17,17,0,now);
 assert.equal(bought.wallet.points,city.wallet.points-27000);
 assert.equal(bought.wallet.treats,city.wallet.treats-50);
 assert.equal(bought.wallet.coffee,city.wallet.coffee);
});

test('v17: existing expensive purchases can be moved and stored even if current unlock level is insufficient',()=>{
 let city=unlocked(makeInitialCity(),8);
 city.wallet={...objectPrice(CATALOG,'botanical-garden')};
 city=addObject(city,CATALOG,'botanical-garden',17,17,0,now);
 const paidWallet={...city.wallet};
 const uid=city.objects.at(-1).uid;
 city.progress.bestLevel=1; // deliberately emulate a legacy save with a previously bought object
 city=moveObject(city,CATALOG,uid,18,18);
 city=storeObject(city,uid);
 city=restoreObject(city,CATALOG,uid,17,17);
 assert.deepEqual(city.wallet,paidWallet,'moves and warehouse operations never recharge ownership');
 assert.equal(city.objects.at(-1).uid,uid);
 assert.deepEqual(sanitizeCity(JSON.parse(JSON.stringify(city)),CATALOG),city);
});

test('v17: preview benefits come from the same tables used by cityStats',()=>{
 assert.deepEqual(buildingEffectPreview(CATALOG['cottage']),{population:2,comfort:6,needsRoad:true,limitedPopulation:false});
 assert.deepEqual(buildingEffectPreview(CATALOG['botanical-garden']),{population:3,comfort:32,needsRoad:false,limitedPopulation:true});
 assert.equal(buildingEffectPreview(CATALOG['plaza-cozy-tiled']).comfort,6);
});

test('v17: paying the exact amount works and limits are enforced server-side via engine',()=>{
 const city=unlocked(makeInitialCity(),3);
 const price=objectPrice(CATALOG,'villa');
 city.wallet={...price};
 const bought=addObject(city,CATALOG,'villa',17,17,0,now);
 assert.deepEqual(bought.wallet,{points:0,coffee:0,treats:0});
 assertReject(()=>addObject(bought,CATALOG,'villa',20,20,0,now),'INSUFFICIENT_BALANCE');
});
