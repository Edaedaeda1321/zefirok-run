import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
 makeInitialCity, cloneCity, addObject, storeObject, applyRoadStroke,
 cityStats, connectedRoads, keyOf, visibleCitizenCount, comfortTierFor,
 sanitizeCity
} from '../engine.js';
import { CATALOG } from '../catalog.js';
import { buildCitizenScene, sampleCitizenScene } from '../citizens.js';

const initial=()=>makeInitialCity();
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');

test('starter town has two residents and 15 comfort; only one completed house',()=>{
 const c=initial(),stats=cityStats(c,CATALOG);
 assert.equal(stats.population,2);
 assert.equal(stats.comfort,15);
 assert.equal(stats.comfortTier,'empty');
 assert.equal(stats.structures,1);
 assert.equal(stats.completedStructures,1);
 assert.equal(stats.visibleCitizens,1);
 assert.equal(stats.buildings,4); // legacy compatibility
 assert.equal(stats.connected,1);
});
test('comfort comes from real completed buildings and decor; unused terrain earns none',()=>{
 const now=1000000;
 let c=addObject(initial(),CATALOG,'tree',19,19,0,now);
 assert.equal(cityStats(c,CATALOG,now).comfort,17);
 c=addObject(c,CATALOG,'terrain_platform_plain_premium',20,19,0,now);
 assert.equal(cityStats(c,CATALOG,now).comfort,17);
 c=addObject(c,CATALOG,'garden',16,16,0,now);
 assert.equal(cityStats(c,CATALOG,now).comfort,17,'active construction gives zero comfort');
 assert.equal(cityStats(c,CATALOG,now+200000).comfort,35,'finished park adds 18');
 assert.equal(cityStats(c,CATALOG,now+200000).comfortTier,'corner');
});
test('population increases only when occupied buildings finish and connect to the main road',()=>{
 const now=1000000;
 let c=initial();
 c=applyRoadStroke(c,CATALOG,[15,16,17,18,19].map(x=>({x,y:13})));
 c=addObject(c,CATALOG,'family-home',16,11,0,now);
 assert.equal(cityStats(c,CATALOG,now).population,2);
 assert.equal(cityStats(c,CATALOG,now+300001).population,6);
 assert.equal(cityStats(c,CATALOG,now+300001).visibleCitizens,2);
 assert.equal(cityStats(c,CATALOG,now+300001).completedStructures,2);
 c=storeObject(c,c.objects.at(-1).uid);
 assert.equal(cityStats(c,CATALOG,now+300001).population,2);
});
test('losing road access removes household residents, not ownership or wallet',()=>{
 const c=initial(),money={...c.wallet};
 const after=applyRoadStroke(c,CATALOG,[{x:9,y:13},{x:10,y:13}],{erasing:true});
 const stats=cityStats(after,CATALOG);
 assert.equal(stats.population,0);
 assert.equal(stats.comfort,13); // road connection bonus disappears
 assert.deepEqual(after.wallet,money);
 assert.equal(after.objects[0].uid,'obj-1');
});
test('diverse city with homes, shops and park earns one diversity bonus',()=>{
 const now=1200000;
 let city=initial();
 city=applyRoadStroke(city,CATALOG,Array.from({length:8},(_,i)=>({x:15+i,y:13})));
 city=addObject(city,CATALOG,'family-home',16,11,0,now);
 city=addObject(city,CATALOG,'coffee-kiosk',21,11,0,now);
 city=addObject(city,CATALOG,'garden',16,16,0,now);
 const before=cityStats(city,CATALOG,now);
 assert.equal(before.population,2,'not-yet-complete builds do not create residents');
 assert.equal(before.comfort,15);
 const after=cityStats(city,CATALOG,now+400000);
 assert.equal(after.population,7,'2 starter residents, 4 family, 1 cafe worker');
 assert.equal(after.comfort,65,'15 starter + 12 family + 10 cafe + 18 park + 10 diversity');
 assert.equal(after.comfortTier,'district');
});
test('comfort tiers and visible NPC budget grow deterministically with the city',()=>{
 assert.deepEqual([0,19,20,49,50,99,100,199,200].map(comfortTierFor),
  ['empty','empty','corner','corner','district','district','town','town','magical']);
 assert.deepEqual([0,2,4,5,16,48,1000].map(visibleCitizenCount),[0,1,1,2,4,12,12]);
});
test('all sampled citizen routes stay on connected Road and never teleport',()=>{
 const city=initial(),roads=connectedRoads(city),scene=buildCitizenScene(city,CATALOG,2,100000);
 assert.equal(scene.routes.length,1);
 for(const citizen of scene.routes){
  for(let i=0;i<citizen.track.length;i++){
   const p=citizen.track[i],next=citizen.track[(i+1)%citizen.track.length];
   assert.ok(roads.has(p.id),`resident off road: ${p.id}`);
   assert.ok(Math.abs(next.x-p.x)+Math.abs(next.y-p.y)<=1,'non-neighbor jump');
  }
 }
 for(let t=0;t<180000;t+=10000){
  const [person]=sampleCitizenScene(scene,t);
  assert.ok(person);
  assert.ok(person.y>=13.5&&person.y<=13.5);
  assert.ok(person.x>=7.5&&person.x<=15.5);
 }
 assert.equal(buildCitizenScene(city,CATALOG,1000).routes.length,12);
});
test('the animation is derived and never persists into save JSON, wallet or D1',()=>{
 const city=initial(),original=JSON.stringify(city),before={...city.wallet};
 const scene=buildCitizenScene(city,CATALOG,2,100000);
 sampleCitizenScene(scene,130000);sampleCitizenScene(scene,155000);
 assert.equal(JSON.stringify(city),original);
 assert.deepEqual(city.wallet,before);
 assert.deepEqual(sanitizeCity(JSON.parse(original),CATALOG),city);
});
test('hosted and sandbox pages show residents, comfort and a rank without the old top counters',()=>{
 for(const file of ['../../world.html','../index.html']){
  const html=read(file);
  for(const id of ['populationCount','comfortCount','comfortTier','buildingsCount','constructingCount'])
   assert.match(html,new RegExp(`id="${id}"`));
  assert.doesNotMatch(html,/id="connectedCount"|id="roadsCount"/);
 }
 const app=read('../app.js'),renderer=read('../renderer.js');
 assert.match(app,/buildCitizenScene\(state\.city,CATALOG,stats\.population\)/);
 assert.match(app,/sampleCitizenScene\(state\.citizenScene,now\)/);
 assert.match(renderer,/drawCitizen\(ctx,layer\.person/);
 assert.match(app,/document\.hidden\|\|motionReduced/);
});
