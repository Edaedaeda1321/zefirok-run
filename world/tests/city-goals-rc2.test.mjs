import test from 'node:test';
import assert from 'node:assert/strict';
import {makeInitialCity,cityStats,CITY_LEVELS,buildingEffectPreview} from '../engine.js';
import {CATALOG,CATALOG_ITEMS} from '../catalog.js';
import {nextCityGoal,cityGoalMilestone} from '../city-goal.js';

function fixture({wallet={points:60000,treats:1000,coffee:100},city,stats,purchasesEnabled=true,now=Date.now()}={}){
 const c=city?structuredClone(city):makeInitialCity(); c.wallet={...wallet};
 const s=stats||cityStats(c,CATALOG,now);
 const input={city:c,stats:s,catalog:CATALOG,catalogItems:CATALOG_ITEMS,now,purchasesEnabled};
 const original=JSON.stringify(c);
 const goal=nextCityGoal(input);
 assert.equal(JSON.stringify(c),original,'advice must NEVER modify city or wallet');
 return goal;
}
const level2=()=>CITY_LEVELS[1];
const stats=(diff={},level=level2())=>({cityLevel:level.level-1,nextCityLevel:level,claimableLevel:null,
 population:0,comfort:0,parks:0,shops:0,...diff});

test('RC2: level 1 recommends an affordable, actually unlocked park',()=>{
 const g=fixture({stats:stats({population:2,comfort:15})});
 assert.equal(g.type,'build');assert.equal(g.goal,'parks');
 assert.equal(g.itemId,'playground');assert.equal(CATALOG[g.itemId].category,'parks');
 assert.ok(g.price.points>0);assert.ok(CATALOG[g.itemId].minCityLevel<=1);
});

test('RC2: a relevant in-progress park is not replaced by a duplicate purchase',()=>{
 const now=Date.now();const city=makeInitialCity();
 city.objects.push({uid:'obj-999',kind:'playground',x:10,y:12,rotation:0,buildStartedAt:now-5000,buildReadyAt:now+120000,stored:false});
 const g=fixture({city,now,stats:stats({population:2,comfort:15})});
 assert.equal(g.type,'wait');assert.equal(g.uid,'obj-999');assert.equal(g.itemId,'playground');
});

test('RC2: no money leads to earn suggestion, never bypasses level restrictions',()=>{
 const g=fixture({wallet:{points:10,coffee:0,treats:0},stats:stats({population:2,comfort:15})});
 assert.equal(g.type,'earn');assert.ok(g.missing.points>0);
 assert.ok(CATALOG[g.itemId].minCityLevel<=1);
});

test('RC2: server pause is distinct from shortage, no payment advice when disabled',()=>{
 const g=fixture({purchasesEnabled:false,stats:stats({population:2,comfort:15})});
 assert.equal(g.type,'paused');assert.equal(g.button,'Покупки закрыты');
});

test('RC2: already earned level gift has priority even when purchases are disabled',()=>{
 const g=fixture({purchasesEnabled:false,stats:stats({claimableLevel:2,population:4,comfort:30,parks:1})});
 assert.equal(g.type,'claim');assert.equal(g.level,2);
});

test('RC2: disconnected home is a road problem instead of a new home purchase',()=>{
 const city=makeInitialCity();city.roads=[];
 city.objects.push({uid:'obj-999',kind:'cottage',x:20,y:20,rotation:0,buildStartedAt:0,buildReadyAt:0,stored:false});
 const g=fixture({city,stats:stats({parks:1,shops:1,population:2,comfort:15},CITY_LEVELS[2])});
 assert.equal(g.type,'road');assert.ok(['obj-1','obj-999'].includes(g.uid));
});

test('RC2: at city level 2 shops are required, only accessible buildings suggested',()=>{
 const next=CITY_LEVELS[2];
 const g=fixture({stats:stats({cityLevel:2,population:9,comfort:61,parks:1,shops:0},next)});
 assert.equal(g.goal,'shops');assert.equal(g.type,'build');
 assert.equal(CATALOG[g.itemId].category,'shops');assert.ok(CATALOG[g.itemId].minCityLevel<=2);
});

test('RC2: first resident shortfall suggests a home after park requirements fulfilled',()=>{
 const g=fixture({stats:stats({population:3,comfort:35,parks:1})});
 assert.equal(g.goal,'population');assert.equal(g.type,'build');
 assert.ok(buildingEffectPreview(CATALOG[g.itemId]).population>0);
});

test('RC2: higher comfort goal prefers useful parks over spamming cheap 1x1 decorations',()=>{
 const g=fixture({stats:stats({cityLevel:2,population:9,comfort:51,parks:1,shops:1},CITY_LEVELS[2])});
 assert.equal(g.type,'build');assert.equal(g.goal,'comfort');
 assert.ok(buildingEffectPreview(CATALOG[g.itemId]).comfort>=8);
});

test('RC2: level 10 complete state never suggests an eleventh level',()=>{
 const g=fixture({stats:{cityLevel:10,claimableLevel:null,nextCityLevel:null,population:40,comfort:400,parks:3,shops:2}});
 assert.equal(g.type,'done');assert.equal(g.button,'');
});

test('RC2: milestones only announced on a real positive transition',()=>{
 assert.equal(cityGoalMilestone(null,{cityLevel:1,parks:0,shops:0}),'');
 assert.match(cityGoalMilestone({cityLevel:1,parks:0,shops:0},{cityLevel:2,parks:1,shops:0}),/уровень/i);
 assert.match(cityGoalMilestone({cityLevel:1,parks:0,shops:0},{cityLevel:1,parks:1,shops:0}),/парк/i);
 assert.equal(cityGoalMilestone({cityLevel:2,parks:1,shops:1},{cityLevel:2,parks:1,shops:1}),'');
});

test('RC2: the RC-2 suggestion does not introduce server writes or mutate a prepared save',()=>{
 const city=makeInitialCity();const before=JSON.stringify(city);
 const first=fixture({city});const second=fixture({city});
 assert.deepEqual(first,second);assert.equal(JSON.stringify(city),before);
});
