import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG, CATALOG_ITEMS } from '../catalog.js';
import { PARCEL_PRICE, ROAD_TILE_PRICE, OBJECT_PRICES } from '../economy.js';
import { makeInitialCity, addObject, canAfford, objectPrice, BuildError, sanitizeCity } from '../engine.js';

// The 1,500 points / 5 treats / 5 coffee estimate is a DESIGN HYPOTHESIS,
// not measured live-D1 player run telemetry. See README for calibration.
const RUN_EARNINGS = Object.freeze({points:1500,coffee:5,treats:5});
const runsOf = (kind) => {
 const p = objectPrice(CATALOG,kind);
 return Math.max(...Object.keys(RUN_EARNINGS).map(currency=>p[currency]/RUN_EARNINGS[currency]));
};

const checkRunBand=(ids,min,max)=>{
 for(const id of ids){
  const amount=runsOf(id);
  assert.ok(amount>=min && amount<=max,`${id}: ${amount.toFixed(2)} target runs must be in [${min}, ${max}]`);
 }
};

test('starter HOMES and small shops take about 3-4 ordinary runs from empty wallet',()=>{
 checkRunBand(['cottage','coffee-kiosk','flower-shop'],3,4);
 // Only three ordinary runs cannot buy the full building; four can.
 for(const kind of ['cottage','coffee-kiosk','flower-shop']){
  const city=makeInitialCity();
  city.wallet={points:3*RUN_EARNINGS.points,coffee:3*RUN_EARNINGS.coffee,treats:3*RUN_EARNINGS.treats};
  assert.equal(canAfford(city.wallet,objectPrice(CATALOG,kind)),false,kind);
  assert.throws(()=>addObject(city,CATALOG,kind,16,18,0,1800000000000),
   error=>error instanceof BuildError&&error.code==='INSUFFICIENT_BALANCE');
  city.wallet={points:4*RUN_EARNINGS.points,coffee:4*RUN_EARNINGS.coffee,treats:4*RUN_EARNINGS.treats};
  const built=addObject(city,CATALOG,kind,16,18,0,1800000000000);
  assert.equal(built.objects.at(-1).kind,kind);
 }
});

test('large buildings and parks cost meaningfully more than smaller ones',()=>{
 checkRunBand(['family-home','bakery','playground'],6,8);
 checkRunBand(['villa','coffee-house','garden'],10,14);
 assert.ok(runsOf('plaza-prestige-podium')>=15);
 for(const sequence of [
  ['cottage','family-home','villa'],
  ['coffee-kiosk','bakery','coffee-house'],
  ['playground','garden']
 ]){
  for(let i=1;i<sequence.length;i++){
   assert.ok(CATALOG[sequence[i]].price.points>CATALOG[sequence[i-1]].price.points,sequence.join(' < '));
  }
 }
});

test('all 41 catalog prices are positive, safe integers and still server-quoteable',()=>{
 assert.equal(CATALOG_ITEMS.length,41);
 for(const item of CATALOG_ITEMS){
  assert.deepEqual(item.price,OBJECT_PRICES[item.id],item.id);
  for(const key of ['points','coffee','treats']){
   assert.ok(Number.isSafeInteger(item.price[key])&&item.price[key]>=0,`${item.id}/${key}`);
  }
  assert.ok(Object.values(item.price).some(x=>x>0),item.id);
 }
 assert.deepEqual(ROAD_TILE_PRICE,{points:50,coffee:0,treats:0});
 assert.deepEqual(PARCEL_PRICE,{points:1200,coffee:0,treats:10});
});

test('rebalancing never alters balances or recharges already owned objects',()=>{
 const current=makeInitialCity();
 const wallet={...current.wallet};
 const snapshot=JSON.parse(JSON.stringify(current));
 const loaded=sanitizeCity(snapshot,CATALOG);
 assert.deepEqual(loaded.wallet,wallet);
 assert.deepEqual(loaded.objects,current.objects);
});
