import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG } from '../catalog.js';
import {
 CITY_LEVELS, makeInitialCity, cloneCity, sanitizeCity, addObject,
 storeObject, cityStats, reconcileCityProgress, claimCityLevelReward, BuildError
} from '../engine.js';

const NOW = 1_800_000_000_000;
const rich = () => {
 const city = makeInitialCity();
 city.wallet = {points: 5_000_000, treats: 10_000, coffee: 10_000};
 return city;
};

function finishNewCityObject(city, kind, x, y, rotation=0) {
 const ms = Number(CATALOG[kind].buildMs||0);
 return addObject(city, CATALOG, kind, x, y, rotation, NOW-ms-1);
}

test('v12 keeps 5 server-authoritative city level definitions and one-time currency rewards',()=>{
 assert.deepEqual(CITY_LEVELS.map(l=>l.level),[1,2,3,4,5]);
 assert.deepEqual(CITY_LEVELS.map(l=>l.reward?.points||0),[0,500,1000,2000,4000]);
 assert.ok(CITY_LEVELS.slice(1).every(l=>['points','coffee','treats'].every(k=>Number.isSafeInteger(l.reward[k])&&l.reward[k]>=0)));
});

test('v12 preserves new transport and new park prices, construction and population bonuses',()=>{
 for(const kind of ['bus-terminal','bus-stop','pond-park','rose-garden','botanical-garden','sports-playground','city-square']){
  assert.ok(CATALOG[kind],`Missing New City v10 object ${kind}`);
  assert.ok(Number(CATALOG[kind].buildMs)>0,`Missing stage duration ${kind}`);
  assert.ok(CATALOG[kind].price.points>0,`New City price disappeared for ${kind}`);
 }
 let city=rich();
 city=finishNewCityObject(city,'pond-park',16,16);
 city=finishNewCityObject(city,'rose-garden',19,16);
 const stats=cityStats(city,CATALOG,NOW);
 assert.equal(stats.parks,2);
 assert.equal(stats.population,6,'2 starter residents + 2 pond visitors + 2 rose garden visitors');
 assert.ok(stats.comfort>=24+20);
 assert.equal(stats.cityLevel,2,'New City parks contribute to city level progression');
});

test('v12 never awards park population from objects still under construction or on storage',()=>{
 const c=rich();
 const started=addObject(c,CATALOG,'pond-park',16,16,0,NOW);
 assert.equal(cityStats(started,CATALOG,NOW).population,2);
 const completed=cityStats(started,CATALOG,NOW+180001);
 assert.equal(completed.population,4);
 const stored=storeObject(started,started.objects.at(-1).uid);
 assert.equal(cityStats(stored,CATALOG,NOW+180001).population,2);
});

test('v12 persists level on city storage and grants reward exactly once even on new city maps',()=>{
 let city=rich();
 city=finishNewCityObject(city,'pond-park',16,16);
 assert.equal(cityStats(city,CATALOG,NOW).claimableLevel,2);
 const original=cloneCity(city);
 const next=claimCityLevelReward(city,CATALOG,2,NOW);
 assert.deepEqual(city,original,'claim cannot mutate original city snapshot');
 assert.equal(next.wallet.points,city.wallet.points+500);
 assert.equal(next.wallet.treats,city.wallet.treats+5);
 assert.equal(next.progress.bestLevel,2);
 assert.deepEqual(next.progress.claimedLevels,[2]);
 assert.throws(()=>claimCityLevelReward(next,CATALOG,2,NOW),e=>e instanceof BuildError&&e.code==='CITY_LEVEL_CLAIMED');
 const offMap=storeObject(next,next.objects.at(-1).uid);
 assert.equal(cityStats(offMap,CATALOG,NOW).qualifiedLevel,1);
 assert.equal(cityStats(offMap,CATALOG,NOW).cityLevel,2);
 assert.deepEqual(reconcileCityProgress(offMap,CATALOG,NOW).progress.claimedLevels,[2]);
 assert.deepEqual(sanitizeCity(JSON.parse(JSON.stringify(offMap)),CATALOG),offMap);
});

test('v12 reads old city save safely and blocks client-forged claim metadata',()=>{
 const legacy=rich();delete legacy.progress;
 assert.deepEqual(sanitizeCity(legacy,CATALOG).progress,{bestLevel:1,claimedLevels:[]});
 const broken=rich();broken.progress={bestLevel:5,claimedLevels:[2,2]};
 assert.throws(()=>sanitizeCity(broken,CATALOG),e=>e instanceof BuildError&&e.code==='INVALID_SAVE');
});
