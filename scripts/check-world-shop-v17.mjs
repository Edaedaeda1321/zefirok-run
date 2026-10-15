// Zeffi World v17 price, purchase level and UI integration guard.
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { CATALOG, CATALOG_ITEMS } from '../world/catalog.js';
import { OBJECT_PRICES, ROAD_TILE_PRICE, PARCEL_PRICE } from '../world/economy.js';
import { makeInitialCity, addObject, objectPrice, cityStats, buildingEffectPreview, BuildError } from '../world/engine.js';

assert.equal(CATALOG_ITEMS.length,51);
assert.equal(Object.keys(OBJECT_PRICES).length,51);
assert.equal(CATALOG.cottage.price.points,5500);
assert.equal(CATALOG.cottage.minCityLevel,1);
assert.equal(CATALOG['bus-terminal'].minCityLevel,7);
assert.equal(CATALOG['botanical-garden'].minCityLevel,8);
assert.deepEqual(ROAD_TILE_PRICE,{points:50,coffee:0,treats:0});
assert.equal(PARCEL_PRICE.points,1200);
assert.equal(PARCEL_PRICE.treats,10);
for(const def of CATALOG_ITEMS){
 assert.deepEqual(objectPrice(CATALOG,def.id),def.price);
 assert.equal(def.price.coffee,0);
 assert.ok(def.price.points>0);
 assert.ok(def.minCityLevel>=1&&def.minCityLevel<=10);
}
const starter=makeInitialCity();
const before=JSON.stringify(starter);
assert.equal(cityStats(starter,CATALOG).cityLevel,1);
assert.throws(()=>addObject(starter,CATALOG,'bus-terminal',17,17),e=>e instanceof BuildError&&e.code==='BUILDING_LEVEL_LOCKED');
assert.equal(JSON.stringify(starter),before);
assert.equal(buildingEffectPreview(CATALOG['botanical-garden']).comfort,32);
const unlocked=makeInitialCity();unlocked.progress.bestLevel=7;unlocked.wallet.points=500000;
const paid=addObject(unlocked,CATALOG,'bus-terminal',17,17);
assert.equal(paid.wallet.points,500000-CATALOG['bus-terminal'].price.points);
const ui=readFileSync(new URL('../world/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../world/premium-ui.css',import.meta.url),'utf8');
const worker=readFileSync(new URL('../src/zeffi-world-service.js',import.meta.url),'utf8');
assert.match(ui,/shopSortedItems\(/);
// v18 replaces the oversized v17 banner with a DIV and the shared lock icon.
assert.match(ui,/createElement\('div'\);mark\.className='catalog-lock-mark'/);
assert.match(ui,/icon\.className='catalog-lock-icon'/);
assert.doesNotMatch(ui,/catalog-level-lock/);
assert.match(ui,/shopShortfall\(/);
assert.match(css,/catalog-card\.is-level-locked/);
assert.match(worker,/addObject\(city,CATALOG/);
console.log('World shop v17: 51 prices, 10 levels, server purchase guard, UI and preserved old systems PASS');
