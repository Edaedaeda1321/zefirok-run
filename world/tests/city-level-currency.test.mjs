import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG} from '../catalog.js';
import {CITY_LEVELS,makeInitialCity,cityStats,claimCityLevelReward,reconcileCityProgress,
        sanitizeCity,cloneCity,addObject,storeObject,BuildError} from '../engine.js';

const err=(fn,code)=>assert.throws(fn,error=>error instanceof BuildError&&error.code===code);
const oldSave=()=>makeInitialCity();
const now=1800000000000;
function level2(){
 const c=makeInitialCity(); c.wallet.points=200000;c.wallet.treats=4000;c.wallet.coffee=1000;
 // Both are unlocked at city level 1 and together meet level-2 needs.
 const shop=addObject(c,CATALOG,'coffee-kiosk',11,11,0,now-301000);
 return addObject(shop,CATALOG,'playground',16,16,0,now-130000);
}

test('four city level milestones have fixed, modest and safe three-currency rewards',()=>{
 assert.equal(CITY_LEVELS.length,10);
 assert.equal(CITY_LEVELS[0].reward,null);
 for(const data of CITY_LEVELS.slice(1)){
  assert.ok(data.reward.points>0);
  for(const currency of ['points','treats','coffee']){
   assert.ok(Number.isSafeInteger(data.reward[currency])&&data.reward[currency]>=0);
  }
 }
 assert.deepEqual(CITY_LEVELS.map(x=>x.reward?.points||0),[0,500,1000,2000,4000,5500,7500,11000,15000,25000]);
});

test('garden attracts residents only when built; level 2 needs a garden and sufficient comfort',()=>{
 const c=level2();
 assert.equal(cityStats(c,CATALOG,now-129000).cityLevel,1);
 const stats=cityStats(c,CATALOG,now);
 assert.equal(stats.population,4);
 assert.ok(stats.comfort>=30);
 assert.equal(stats.cityLevel,2);
 assert.equal(stats.claimableLevel,2);
 assert.equal(stats.parks,1);
});

test('claim rewards all currencies exactly once, persists level and does not spawn any items',()=>{
 const c=level2();const before=cloneCity(c),price=CITY_LEVELS[1].reward;
 const next=claimCityLevelReward(c,CATALOG,2,now);
 assert.equal(next.progress.bestLevel,2);
 assert.deepEqual(next.progress.claimedLevels,[2]);
 assert.equal(next.objects.length,c.objects.length);
 assert.equal(next.nextId,c.nextId);
 for(const k of ['points','treats','coffee'])assert.equal(next.wallet[k],before.wallet[k]+price[k]);
 assert.deepEqual(c,before,'operation is purely functional');
 assert.deepEqual(sanitizeCity(JSON.parse(JSON.stringify(next)),CATALOG),next);
 err(()=>claimCityLevelReward(next,CATALOG,2,now),'CITY_LEVEL_CLAIMED');
 err(()=>claimCityLevelReward(next,CATALOG,3,now),'CITY_LEVEL_LOCKED');
});

test('saving an earned city level prevents farming by moving parks into storage',()=>{
 let c=claimCityLevelReward(level2(),CATALOG,2,now);
 const planted=c.objects.at(-1).uid;
 c=storeObject(c,planted);
 assert.equal(cityStats(c,CATALOG,now).qualifiedLevel,1);
 assert.equal(cityStats(c,CATALOG,now).cityLevel,2);
 assert.equal(cityStats(c,CATALOG,now).claimableLevel,null);
 assert.deepEqual(reconcileCityProgress(c,CATALOG,now).progress.claimedLevels,[2]);
});

test('old cities without progress migrate on read and can claim earned rewards once',()=>{
 const legacy=level2(); delete legacy.progress;
 const read=sanitizeCity(legacy,CATALOG);
 assert.deepEqual(read.progress,{bestLevel:1,claimedLevels:[]});
 const claimed=claimCityLevelReward(read,CATALOG,2,now);
 assert.equal(claimed.progress.bestLevel,2);
 assert.deepEqual(claimed.progress.claimedLevels,[2]);
});

test('currency overflow and forged claim flags fail closed',()=>{
 const city=level2();city.wallet.points=Number.MAX_SAFE_INTEGER;
 err(()=>claimCityLevelReward(city,CATALOG,2,now),'WALLET_LIMIT');
 const corrupt=level2();corrupt.progress={bestLevel:2,claimedLevels:[2,2]};
 err(()=>sanitizeCity(corrupt,CATALOG),'INVALID_SAVE');
});
